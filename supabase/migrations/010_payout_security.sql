-- ═══════════════════════════════════════════════════════════════════════════
-- 010: Payout Logic, Security Hardening, Daily Refill, Void Handling
--
-- • Harden place_entry with full validation
-- • Harden deduct_credits (positive amount check)
-- • Lock window enforcement (15 min before match)
-- • Rate limiting (5 entries/min)
-- • Duplicate prop line check
-- • Max wager cap (2,000 K-Coins), min wager (50)
-- • Daily refill function
-- • Void match function
-- • Restrict direct balance updates via RLS
-- • Secure leaderboard view (no email exposure)
-- • Profile update RPC (no direct UPDATE on users)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Harden deduct_credits ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
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

-- ─── 2. Harden place_entry ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION place_entry(
  p_user_id UUID,
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

-- ─── 3. Daily refill function ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION daily_refill()
RETURNS VOID AS $$
BEGIN
  -- Anyone below 500 K-Coins gets topped up to 1,000
  UPDATE public.users
  SET balance = 1000, updated_at = now()
  WHERE balance < 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. Void match function ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION void_match(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_entry RECORD;
BEGIN
  -- Void all prop lines for this match
  UPDATE public.prop_lines SET status = 'void' WHERE match_id = p_match_id;

  -- Void affected entry legs
  UPDATE public.entry_legs SET result = 'void'
  WHERE prop_line_id IN (SELECT id FROM public.prop_lines WHERE match_id = p_match_id);

  -- Refund entries where ALL legs are now void
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

  -- Refund entries with a MIX of void and non-void legs (simplest approach)
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

  -- Mark match as cancelled
  UPDATE public.matches SET status = 'cancelled' WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Profile update RPC (no direct UPDATE on balance) ──────────────────

CREATE OR REPLACE FUNCTION update_profile(p_username TEXT DEFAULT NULL, p_avatar TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET username = COALESCE(p_username, username),
      avatar_emoji = COALESCE(p_avatar, avatar_emoji),
      updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Tighten RLS — remove direct UPDATE ability on users ───────────────

-- Drop the old broad update policy
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- No UPDATE policy at all — all changes go through SECURITY DEFINER RPCs
-- (deduct_credits, place_entry, settle_prop_line, update_profile, daily_refill)

-- ─── 7. Secure leaderboard view ──────────────────────────────────────────

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

-- ─── 8. Fix entries table wager check to 50 minimum ──────────────────────

-- Drop old check constraint and add new one
ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_wager_check;
ALTER TABLE public.entries ADD CONSTRAINT entries_wager_check CHECK (wager >= 50);
