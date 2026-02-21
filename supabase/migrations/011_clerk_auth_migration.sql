-- ═══════════════════════════════════════════════════════════════════════════
-- 011: Clerk Auth Migration — UUID → TEXT user IDs
--
-- Clerk user IDs are strings like 'user_2x4y...' instead of UUIDs.
-- This migration:
--   1. Drops and recreates users, entries, entry_legs with TEXT IDs
--   2. Removes auth.users FK and old triggers
--   3. Updates all RPC functions for TEXT IDs
--   4. Updates RLS policies for Clerk JWT (auth.uid()::TEXT)
--   5. Recreates the leaderboard view
--
-- ⚠️  This drops ALL user data, entries, and entry_legs.
--     Fine for a dev/portfolio project. Do NOT run in production.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Drop old triggers that reference auth.users ───────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_v2() CASCADE;

-- ─── 2. Drop dependent tables and views ───────────────────────────────────

DROP VIEW IF EXISTS public.leaderboard CASCADE;
DROP TABLE IF EXISTS public.settlement_events CASCADE;
DROP TABLE IF EXISTS public.entry_legs CASCADE;
DROP TABLE IF EXISTS public.entries CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ─── 3. Recreate users table with TEXT id (Clerk user IDs) ────────────────

CREATE TABLE public.users (
  id TEXT PRIMARY KEY,  -- Clerk user ID (e.g., 'user_2x4y...')
  username TEXT UNIQUE NOT NULL,
  avatar_emoji TEXT DEFAULT '🎯',
  balance INTEGER NOT NULL DEFAULT 10000,
  total_wagered INTEGER DEFAULT 0,
  total_won INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. Recreate entries table ────────────────────────────────────────────

CREATE TABLE public.entries (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  wager INTEGER NOT NULL CHECK (wager >= 50),
  multiplier NUMERIC(4,1) NOT NULL,
  potential_payout INTEGER NOT NULL,
  actual_payout INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void', 'partial')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. Recreate entry_legs table ─────────────────────────────────────────

CREATE TABLE public.entry_legs (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER REFERENCES public.entries(id) ON DELETE CASCADE,
  prop_line_id UUID REFERENCES public.prop_lines(id),
  pick TEXT NOT NULL CHECK (pick IN ('over', 'under')),
  result TEXT CHECK (result IN ('won', 'lost', 'push', 'void')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. Recreate settlement_events ───────────────────────────────────────

CREATE TABLE public.settlement_events (
  id SERIAL PRIMARY KEY,
  prop_line_id UUID REFERENCES public.prop_lines(id),
  actual_result NUMERIC(6,1),
  settled_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. Indexes ──────────────────────────────────────────────────────────

CREATE INDEX idx_entries_user ON public.entries(user_id);
CREATE INDEX idx_entry_legs_entry ON public.entry_legs(entry_id);
CREATE INDEX idx_entry_legs_prop ON public.entry_legs(prop_line_id);

-- ─── 8. RLS Policies ────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);
-- No UPDATE/INSERT/DELETE policies — all mutations through SECURITY DEFINER RPCs + webhook

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own entries" ON public.entries
  FOR SELECT USING (auth.uid()::TEXT = user_id);
CREATE POLICY "Users create entries via RPC" ON public.entries
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

ALTER TABLE public.entry_legs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own legs" ON public.entry_legs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.entries
    WHERE entries.id = entry_legs.entry_id
    AND entries.user_id = auth.uid()::TEXT
  ));

-- ─── 9. Recreate RPC functions with TEXT user IDs ────────────────────────

-- deduct_credits
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id TEXT, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE public.users
  SET balance = balance - p_amount,
      total_wagered = total_wagered + p_amount,
      updated_at = now()
  WHERE id = p_user_id AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- place_entry
CREATE OR REPLACE FUNCTION place_entry(
  p_user_id TEXT,
  p_legs JSONB,
  p_wager INTEGER,
  p_multiplier NUMERIC,
  p_potential_payout INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_entry_id INTEGER;
  v_leg JSONB;
  v_leg_count INTEGER;
BEGIN
  v_leg_count := jsonb_array_length(p_legs);

  -- Validation: leg count
  IF v_leg_count < 2 THEN RAISE EXCEPTION 'Minimum 2 legs required'; END IF;
  IF v_leg_count > 6 THEN RAISE EXCEPTION 'Maximum 6 legs allowed'; END IF;

  -- Validation: wager range
  IF p_wager < 50 THEN RAISE EXCEPTION 'Minimum wager is 50 K-Coins'; END IF;
  IF p_wager > 2000 THEN RAISE EXCEPTION 'Maximum wager is 2,000 K-Coins'; END IF;

  -- Validation: all prop lines still open
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_legs) AS leg
    JOIN public.prop_lines pl ON pl.id = (leg->>'prop_line_id')::UUID
    WHERE pl.status NOT IN ('OPEN', 'open')
  ) THEN
    RAISE EXCEPTION 'One or more prop lines are no longer available';
  END IF;

  -- Validation: no duplicate prop lines
  IF (SELECT COUNT(DISTINCT leg->>'prop_line_id') FROM jsonb_array_elements(p_legs) AS leg)
     != v_leg_count THEN
    RAISE EXCEPTION 'Duplicate prop lines not allowed';
  END IF;

  -- Validation: lock window — no matches starting within 15 minutes
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_legs) AS leg
    JOIN public.prop_lines pl ON pl.id = (leg->>'prop_line_id')::UUID
    JOIN public.matches m ON m.id = pl.match_id
    WHERE m.start_time - INTERVAL '15 minutes' <= NOW()
  ) THEN
    RAISE EXCEPTION 'One or more matches have locked (starts within 15 minutes)';
  END IF;

  -- Validation: rate limiting — max 5 entries per minute
  IF (
    SELECT COUNT(*) FROM public.entries
    WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many entries. Wait a moment.';
  END IF;

  -- Deduct credits (also validates balance)
  PERFORM deduct_credits(p_user_id, p_wager);

  -- Create entry
  INSERT INTO public.entries (user_id, wager, multiplier, potential_payout)
  VALUES (p_user_id, p_wager, p_multiplier, p_potential_payout)
  RETURNING id INTO v_entry_id;

  -- Create legs
  FOR v_leg IN SELECT * FROM jsonb_array_elements(p_legs) LOOP
    INSERT INTO public.entry_legs (entry_id, prop_line_id, pick)
    VALUES (v_entry_id, (v_leg->>'prop_line_id')::UUID, v_leg->>'pick');
  END LOOP;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- settle_prop_line (push = win)
CREATE OR REPLACE FUNCTION settle_prop_line(p_prop_line_id UUID, p_actual_result NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_line NUMERIC;
  v_leg RECORD;
  v_entry RECORD;
  v_all_won BOOLEAN;
  v_any_lost BOOLEAN;
BEGIN
  SELECT line_value INTO v_line FROM public.prop_lines WHERE id = p_prop_line_id;
  UPDATE public.prop_lines SET actual_result = p_actual_result, status = 'SETTLED' WHERE id = p_prop_line_id;
  INSERT INTO public.settlement_events (prop_line_id, actual_result) VALUES (p_prop_line_id, p_actual_result);

  FOR v_leg IN
    SELECT el.id, el.entry_id, el.pick FROM public.entry_legs el
    WHERE el.prop_line_id = p_prop_line_id AND el.result IS NULL
  LOOP
    IF (v_leg.pick = 'over' AND p_actual_result > v_line) OR
       (v_leg.pick = 'under' AND p_actual_result < v_line) OR
       (p_actual_result = v_line) THEN
      -- Push counts as a win
      UPDATE public.entry_legs SET result = 'won' WHERE id = v_leg.id;
    ELSE
      UPDATE public.entry_legs SET result = 'lost' WHERE id = v_leg.id;
    END IF;
  END LOOP;

  FOR v_entry IN
    SELECT DISTINCT e.id, e.user_id, e.potential_payout, e.wager
    FROM public.entries e
    JOIN public.entry_legs el ON el.entry_id = e.id
    WHERE el.prop_line_id = p_prop_line_id AND e.status = 'pending'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.entry_legs WHERE entry_id = v_entry.id AND result IS NULL
    ) THEN
      SELECT
        bool_and(result = 'won') AS all_won,
        bool_or(result = 'lost') AS any_lost
      INTO v_all_won, v_any_lost
      FROM public.entry_legs WHERE entry_id = v_entry.id;

      IF v_all_won THEN
        UPDATE public.entries SET status = 'won', actual_payout = potential_payout WHERE id = v_entry.id;
        UPDATE public.users SET
          balance = balance + v_entry.potential_payout,
          total_won = total_won + v_entry.potential_payout,
          wins = wins + 1,
          current_streak = GREATEST(current_streak, 0) + 1,
          updated_at = now()
        WHERE id = v_entry.user_id;
      ELSIF v_any_lost THEN
        UPDATE public.entries SET status = 'lost', actual_payout = 0 WHERE id = v_entry.id;
        UPDATE public.users SET
          losses = losses + 1,
          current_streak = LEAST(current_streak, 0) - 1,
          updated_at = now()
        WHERE id = v_entry.user_id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- daily_refill
CREATE OR REPLACE FUNCTION daily_refill()
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET balance = 1000, updated_at = now()
  WHERE balance < 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- void_match
CREATE OR REPLACE FUNCTION void_match(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_entry RECORD;
BEGIN
  UPDATE public.prop_lines SET status = 'void' WHERE match_id = p_match_id;

  UPDATE public.entry_legs SET result = 'void'
  WHERE prop_line_id IN (SELECT id FROM public.prop_lines WHERE match_id = p_match_id);

  FOR v_entry IN
    SELECT e.id, e.user_id, e.wager
    FROM public.entries e
    WHERE e.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.entry_legs el
      WHERE el.entry_id = e.id AND el.result IS DISTINCT FROM 'void'
    )
  LOOP
    UPDATE public.entries SET status = 'void' WHERE id = v_entry.id;
    UPDATE public.users SET balance = balance + v_entry.wager WHERE id = v_entry.user_id;
  END LOOP;

  FOR v_entry IN
    SELECT e.id, e.user_id, e.wager
    FROM public.entries e
    WHERE e.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.entry_legs el WHERE el.entry_id = e.id AND el.result = 'void'
    )
    AND EXISTS (
      SELECT 1 FROM public.entry_legs el WHERE el.entry_id = e.id AND el.result IS DISTINCT FROM 'void'
    )
  LOOP
    UPDATE public.entries SET status = 'void' WHERE id = v_entry.id;
    UPDATE public.users SET balance = balance + v_entry.wager WHERE id = v_entry.user_id;
  END LOOP;

  UPDATE public.matches SET status = 'cancelled' WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_profile
CREATE OR REPLACE FUNCTION update_profile(p_username TEXT DEFAULT NULL, p_avatar TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET username = COALESCE(p_username, username),
      avatar_emoji = COALESCE(p_avatar, avatar_emoji),
      updated_at = now()
  WHERE id = auth.uid()::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. Recreate leaderboard view ───────────────────────────────────────

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  id,
  username,
  avatar_emoji,
  balance,
  wins,
  losses,
  current_streak,
  (balance - 10000) AS profit,
  CASE WHEN (wins + losses) > 0
    THEN ROUND(wins::NUMERIC / (wins + losses) * 100, 1)
    ELSE 0
  END AS win_rate,
  total_wagered,
  total_won
FROM public.users
ORDER BY balance DESC;
