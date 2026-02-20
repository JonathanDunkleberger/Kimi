-- 004_rpc_functions.sql
-- Atomic RPC functions for placing entries and settling props

-- ─── Deduct credits atomically ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
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

-- ─── Place entry (atomic: deduct + create entry + legs) ─────────────────────
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
BEGIN
  PERFORM deduct_credits(p_user_id, p_wager);

  INSERT INTO public.entries (user_id, wager, multiplier, potential_payout)
  VALUES (p_user_id, p_wager, p_multiplier, p_potential_payout)
  RETURNING id INTO v_entry_id;

  FOR v_leg IN SELECT * FROM jsonb_array_elements(p_legs) LOOP
    INSERT INTO public.entry_legs (entry_id, prop_line_id, pick)
    VALUES (v_entry_id, (v_leg->>'prop_line_id')::UUID, v_leg->>'pick');
  END LOOP;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Settle a prop line and cascade to entries ──────────────────────────────
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

  UPDATE public.prop_lines
  SET actual_result = p_actual_result, status = 'SETTLED'
  WHERE id = p_prop_line_id;

  INSERT INTO public.settlement_events (prop_line_id, actual_result)
  VALUES (p_prop_line_id, p_actual_result);

  FOR v_leg IN
    SELECT el.id, el.entry_id, el.pick
    FROM public.entry_legs el
    WHERE el.prop_line_id = p_prop_line_id AND el.result IS NULL
  LOOP
    IF (v_leg.pick = 'over' AND p_actual_result > v_line) OR
       (v_leg.pick = 'under' AND p_actual_result < v_line) THEN
      UPDATE public.entry_legs SET result = 'won' WHERE id = v_leg.id;
    ELSIF p_actual_result = v_line THEN
      UPDATE public.entry_legs SET result = 'push' WHERE id = v_leg.id;
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
        bool_and(result = 'won' OR result = 'push') AS all_won,
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

-- ─── Auto-create user profile on signup ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, balance)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), 10000)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_v2 ON auth.users;
CREATE TRIGGER on_auth_user_created_v2
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_v2();
