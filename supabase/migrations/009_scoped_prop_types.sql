-- ═══════════════════════════════════════════════════════════════════════════
-- 009: Scoped Prop Types — Remove ambiguous props, add map-scoped ones
--
-- The Golden Rule: NEVER offer a prop on a map that might not be played.
-- Valorant Bo3 → Maps 1-2 guaranteed
-- CoD Bo5 → Maps 1-3 guaranteed
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Add stat_key column to prop_types for programmatic use
ALTER TABLE public.prop_types ADD COLUMN IF NOT EXISTS stat_key TEXT UNIQUE;

-- Step 2: Add best_of column to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS best_of INTEGER DEFAULT 3;

-- Step 3: Set best_of based on game for existing matches
UPDATE public.matches SET best_of = 5 WHERE game = 'cod' AND best_of IS NULL;
UPDATE public.matches SET best_of = 3 WHERE game = 'valorant' AND best_of IS NULL;

-- Step 4: Void old ambiguous prop lines and refund entries
DO $$
DECLARE
  v_entry RECORD;
  v_old_type_ids UUID[];
BEGIN
  -- Get IDs of ambiguous prop types
  SELECT array_agg(id) INTO v_old_type_ids
  FROM public.prop_types
  WHERE name IN ('Kills', 'Total Series Kills', 'Damage');

  IF v_old_type_ids IS NOT NULL AND array_length(v_old_type_ids, 1) > 0 THEN
    -- Mark old-style prop lines as void
    UPDATE public.prop_lines SET status = 'void'
    WHERE prop_type_id = ANY(v_old_type_ids)
      AND status = 'OPEN';

    -- Void entry legs on voided prop lines
    UPDATE public.entry_legs SET result = 'void'
    WHERE prop_line_id IN (SELECT id FROM public.prop_lines WHERE status = 'void');

    -- Refund entries where ALL legs are voided
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
  END IF;
END $$;

-- Step 5: Delete old ambiguous prop types and their orphaned data
-- First delete entry_legs referencing these prop_lines
DELETE FROM public.entry_legs
WHERE prop_line_id IN (
  SELECT id FROM public.prop_lines
  WHERE prop_type_id IN (
    SELECT id FROM public.prop_types
    WHERE name IN ('Kills', 'Total Series Kills', 'Damage')
  )
);
-- Then delete the prop_lines themselves
DELETE FROM public.prop_lines
WHERE prop_type_id IN (
  SELECT id FROM public.prop_types
  WHERE name IN ('Kills', 'Total Series Kills', 'Damage')
);
-- Finally delete the prop types
DELETE FROM public.prop_types WHERE name IN ('Kills', 'Total Series Kills', 'Damage');

-- Step 6: Insert new scoped prop types
INSERT INTO public.prop_types (name, stat_key) VALUES
  -- Per-map kills (both games)
  ('Map 1 Kills', 'kills_m1'),
  ('Map 2 Kills', 'kills_m2'),
  ('Map 3 Kills', 'kills_m3'),

  -- Guaranteed combo kills
  ('Maps 1–2 Kills', 'kills_m1m2'),
  ('Maps 1–3 Kills', 'kills_m1m2m3'),

  -- Guaranteed combo damage
  ('Maps 1–2 Damage', 'damage_m1m2'),
  ('Maps 1–3 Damage', 'damage_m1m2m3'),

  -- Guaranteed combo assists
  ('Maps 1–2 Assists', 'assists_m1m2'),
  ('Maps 1–3 Assists', 'assists_m1m2m3'),

  -- Guaranteed combo deaths
  ('Maps 1–2 Deaths', 'deaths_m1m2'),

  -- Guaranteed first bloods
  ('Maps 1–2 First Bloods', 'first_bloods_m1m2')
ON CONFLICT (name) DO UPDATE SET stat_key = EXCLUDED.stat_key;

-- Step 7: Also set stat_key on any remaining old prop types that didn't get deleted
-- (e.g. Map 1 Kills, Map 2 Kills may already exist from old CoD STAT_TEMPLATES)
UPDATE public.prop_types SET stat_key = 'kills_m1' WHERE name = 'Map 1 Kills' AND stat_key IS NULL;
UPDATE public.prop_types SET stat_key = 'kills_m2' WHERE name = 'Map 2 Kills' AND stat_key IS NULL;
UPDATE public.prop_types SET stat_key = 'kills_m3' WHERE name = 'Map 3 Kills' AND stat_key IS NULL;
UPDATE public.prop_types SET stat_key = 'deaths'   WHERE name = 'Deaths' AND stat_key IS NULL;
UPDATE public.prop_types SET stat_key = 'assists'   WHERE name = 'Assists' AND stat_key IS NULL;
