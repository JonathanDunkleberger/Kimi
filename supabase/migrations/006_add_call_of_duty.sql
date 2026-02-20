-- 006_add_call_of_duty.sql
-- Add Call of Duty League (CDL) support: game column, CDL teams, players, prop types, matches, prop lines

-- ─── Add game column to teams ──────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'game') THEN
    ALTER TABLE public.teams ADD COLUMN game TEXT DEFAULT 'valorant';
  END IF;
END $$;

-- ─── Add game column to matches ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'game') THEN
    ALTER TABLE public.matches ADD COLUMN game TEXT DEFAULT 'valorant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'game_mode') THEN
    ALTER TABLE public.matches ADD COLUMN game_mode TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'series_format') THEN
    ALTER TABLE public.matches ADD COLUMN series_format TEXT DEFAULT 'BO5';
  END IF;
END $$;

-- ─── Update existing Valorant data ────────────────────────────────────────
UPDATE public.teams SET game = 'valorant' WHERE game IS NULL;
UPDATE public.matches SET game = 'valorant' WHERE game IS NULL;

-- ─── Indexes for game filtering ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_teams_game ON public.teams(game);
CREATE INDEX IF NOT EXISTS idx_matches_game ON public.matches(game);

-- ─── CDL Prop Types ────────────────────────────────────────────────────────
INSERT INTO public.prop_types (name) VALUES
  ('Total Kills'),
  ('S&D First Bloods'),
  ('S&D Kills'),
  ('Hardpoint Kills'),
  ('Damage Per 10min'),
  ('Maps Won')
ON CONFLICT (name) DO NOTHING;

-- ─── CDL 2026 Teams ────────────────────────────────────────────────────────
INSERT INTO public.teams (name, abbrev, color, region, game) VALUES
  ('Atlanta FaZe',       'ATL',  '#E43D30', 'NA', 'cod'),
  ('Boston Breach',      'BOS',  '#02FF5F', 'NA', 'cod'),
  ('Carolina Royal Ravens','CAR','#2E1A6E', 'NA', 'cod'),
  ('Las Vegas Legion',   'LV',   '#EE3124', 'NA', 'cod'),
  ('LA Guerrillas',      'LAG',  '#60269E', 'NA', 'cod'),
  ('LA Thieves',         'LAT',  '#FF0000', 'NA', 'cod'),
  ('Miami Heretics',     'MIA',  '#E2012D', 'NA', 'cod'),
  ('Minnesota ROKKR',    'MIN',  '#351F67', 'NA', 'cod'),
  ('New York Subliners', 'NYSL', '#171C38', 'NA', 'cod'),
  ('OpTic Texas',        'OTX',  '#92C951', 'NA', 'cod'),
  ('Seattle Surge',      'SEA',  '#00B2E2', 'NA', 'cod'),
  ('Toronto Ultra',      'TOR',  '#780DA8', 'NA', 'cod')
ON CONFLICT (name) DO UPDATE SET
  abbrev = EXCLUDED.abbrev,
  color = EXCLUDED.color,
  region = EXCLUDED.region,
  game = EXCLUDED.game;

-- ─── CDL Players ───────────────────────────────────────────────────────────
-- FaZe
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Dillon Price', 'Attach', 'Flex', (SELECT id FROM public.teams WHERE abbrev = 'ATL')),
  ('Tyler Pharris', 'aBeZy', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'ATL')),
  ('Chris Lehr', 'Simp', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'ATL')),
  ('McArthur Jovel', 'Cellium', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'ATL'))
ON CONFLICT DO NOTHING;

-- OpTic Texas
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Seth Abner', 'Scump', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'OTX')),
  ('Anthony Cuevas-Castro', 'Shotzzy', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'OTX')),
  ('Indervir Dhaliwal', 'Pred', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'OTX')),
  ('Brandon Dupree', 'Dashy', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'OTX'))
ON CONFLICT DO NOTHING;

-- Toronto Ultra
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Ben Bance', 'Bance', 'Flex', (SELECT id FROM public.teams WHERE abbrev = 'TOR')),
  ('Tobias Deltour', 'CleanX', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'TOR')),
  ('Cameron Lester', 'Cammy', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'TOR')),
  ('Anthony Wheeler', 'Insight', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'TOR'))
ON CONFLICT DO NOTHING;

-- New York Subliners
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Paco Rusiewiez', 'HyDra', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'NYSL')),
  ('Matthew Mochak', 'KiSMET', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'NYSL')),
  ('Cesar Bueno', 'Skyz', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'NYSL')),
  ('Daunte Gray', 'Sib', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'NYSL'))
ON CONFLICT DO NOTHING;

-- LA Thieves
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Kenny Williams', 'Kenny', 'Flex', (SELECT id FROM public.teams WHERE abbrev = 'LAT')),
  ('Zack Denyer', 'Drazah', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'LAT')),
  ('Sam Larew', 'Octane', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'LAT')),
  ('Jared Jeffery', 'Envoy', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'LAT'))
ON CONFLICT DO NOTHING;

-- Seattle Surge
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Lamar Abedi', 'Accuracy', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'SEA')),
  ('Joey Miele', 'Mack', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'SEA')),
  ('Amer Zulbeari', 'Spart', 'Flex', (SELECT id FROM public.teams WHERE abbrev = 'SEA')),
  ('Ian Cruz Porter', 'Havok', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'SEA'))
ON CONFLICT DO NOTHING;

-- Minnesota ROKKR
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Jamie Wightman', 'Ghosty', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'MIN')),
  ('Carson Kelly', 'Brack', 'Flex', (SELECT id FROM public.teams WHERE abbrev = 'MIN')),
  ('Daunte Austin', 'Owakening', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'MIN')),
  ('Adam Sloss', 'KAP', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'MIN'))
ON CONFLICT DO NOTHING;

-- Boston Breach
INSERT INTO public.players (name, ign, role, team_id) VALUES
  ('Anthony Methodz', 'Methodz', 'AR', (SELECT id FROM public.teams WHERE abbrev = 'BOS')),
  ('Cuyler Garland', 'Huke', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'BOS')),
  ('Noah Potanka', 'Vivid', 'SMG', (SELECT id FROM public.teams WHERE abbrev = 'BOS')),
  ('Gage Bohan', 'Beans', 'Flex', (SELECT id FROM public.teams WHERE abbrev = 'BOS'))
ON CONFLICT DO NOTHING;


-- ─── CDL Matches — THIS WEEKEND (Feb 20–22, 2026) ─────────────────────────
-- Match 1: FaZe vs OpTic — TODAY (Live now)
INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
VALUES (
  (SELECT id FROM public.events WHERE name = 'CDL Major II Qualifiers' LIMIT 1),
  (SELECT id FROM public.teams WHERE abbrev = 'ATL'),
  (SELECT id FROM public.teams WHERE abbrev = 'OTX'),
  '2026-02-20T19:00:00Z', 'live', 'cod', 'Hardpoint', 'BO5', 'Rewind'
);

-- Match 2: Subliners vs Thieves — TODAY
INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
VALUES (
  (SELECT id FROM public.events WHERE name = 'CDL Major II Qualifiers' LIMIT 1),
  (SELECT id FROM public.teams WHERE abbrev = 'NYSL'),
  (SELECT id FROM public.teams WHERE abbrev = 'LAT'),
  '2026-02-20T20:30:00Z', 'upcoming', 'cod', 'Search & Destroy', 'BO5', 'Vault'
);

-- Match 3: Toronto vs Boston — SATURDAY
INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
VALUES (
  (SELECT id FROM public.events WHERE name = 'CDL Major II Qualifiers' LIMIT 1),
  (SELECT id FROM public.teams WHERE abbrev = 'TOR'),
  (SELECT id FROM public.teams WHERE abbrev = 'BOS'),
  '2026-02-21T18:00:00Z', 'upcoming', 'cod', 'Control', 'BO5', 'Karachi'
);

-- Match 4: Seattle vs Minnesota — SATURDAY
INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
VALUES (
  (SELECT id FROM public.events WHERE name = 'CDL Major II Qualifiers' LIMIT 1),
  (SELECT id FROM public.teams WHERE abbrev = 'SEA'),
  (SELECT id FROM public.teams WHERE abbrev = 'MIN'),
  '2026-02-21T20:00:00Z', 'upcoming', 'cod', 'Hardpoint', 'BO5', 'Skyline'
);

-- Match 5: Winners Round — SUNDAY
INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
VALUES (
  (SELECT id FROM public.events WHERE name = 'CDL Major II Qualifiers' LIMIT 1),
  (SELECT id FROM public.teams WHERE abbrev = 'ATL'),
  (SELECT id FROM public.teams WHERE abbrev = 'TOR'),
  '2026-02-22T17:00:00Z', 'SCHEDULED', 'cod', 'Hardpoint', 'BO5', 'Rewind'
);

-- ─── Ensure CDL event exists ───────────────────────────────────────────────
INSERT INTO public.events (name, start_date, end_date) VALUES
  ('CDL Major II Qualifiers', '2026-02-20', '2026-02-22')
ON CONFLICT DO NOTHING;

-- Now update the matches that got NULL event_id
UPDATE public.matches SET event_id = (SELECT id FROM public.events WHERE name = 'CDL Major II Qualifiers' LIMIT 1)
WHERE game = 'cod' AND event_id IS NULL;


-- ─── Prop Lines for all CDL matches ────────────────────────────────────────
-- Helper: get prop_type IDs
DO $$
DECLARE
  pt_kills UUID;
  pt_sd_fb UUID;
  pt_sd_kills UUID;
  pt_hp_kills UUID;
  pt_damage UUID;
  pt_maps UUID;
  m_id UUID;
  p_rec RECORD;
BEGIN
  SELECT id INTO pt_kills FROM public.prop_types WHERE name = 'Total Kills';
  SELECT id INTO pt_sd_fb FROM public.prop_types WHERE name = 'S&D First Bloods';
  SELECT id INTO pt_sd_kills FROM public.prop_types WHERE name = 'S&D Kills';
  SELECT id INTO pt_hp_kills FROM public.prop_types WHERE name = 'Hardpoint Kills';
  SELECT id INTO pt_damage FROM public.prop_types WHERE name = 'Damage Per 10min';
  SELECT id INTO pt_maps FROM public.prop_types WHERE name = 'Maps Won';

  -- ── Match 1: ATL FaZe vs OpTic Texas (LIVE — Hardpoint) ──
  SELECT id INTO m_id FROM public.matches WHERE game = 'cod' AND status = 'live' LIMIT 1;

  IF m_id IS NOT NULL THEN
    -- FaZe players
    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'ATL') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'Simp' THEN 28.5
          WHEN p_rec.ign = 'aBeZy' THEN 26.5
          WHEN p_rec.ign = 'Cellium' THEN 24.5
          WHEN p_rec.ign = 'Attach' THEN 23.5
          ELSE 25.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_hp_kills, CASE
          WHEN p_rec.ign = 'Simp' THEN 32.5
          WHEN p_rec.ign = 'aBeZy' THEN 30.5
          WHEN p_rec.ign = 'Cellium' THEN 28.5
          WHEN p_rec.ign = 'Attach' THEN 27.5
          ELSE 29.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_fb, CASE
          WHEN p_rec.ign = 'Simp' THEN 2.5
          WHEN p_rec.ign = 'aBeZy' THEN 2.5
          WHEN p_rec.ign = 'Cellium' THEN 1.5
          WHEN p_rec.ign = 'Attach' THEN 1.5
          ELSE 1.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_kills, CASE
          WHEN p_rec.ign = 'Simp' THEN 8.5
          WHEN p_rec.ign = 'aBeZy' THEN 7.5
          WHEN p_rec.ign = 'Cellium' THEN 7.5
          WHEN p_rec.ign = 'Attach' THEN 6.5
          ELSE 7.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;

    -- OpTic players
    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'OTX') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'Shotzzy' THEN 29.5
          WHEN p_rec.ign = 'Scump' THEN 27.5
          WHEN p_rec.ign = 'Dashy' THEN 26.5
          WHEN p_rec.ign = 'Pred' THEN 25.5
          ELSE 26.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_hp_kills, CASE
          WHEN p_rec.ign = 'Shotzzy' THEN 33.5
          WHEN p_rec.ign = 'Scump' THEN 31.5
          WHEN p_rec.ign = 'Dashy' THEN 29.5
          WHEN p_rec.ign = 'Pred' THEN 28.5
          ELSE 30.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_fb, CASE
          WHEN p_rec.ign = 'Shotzzy' THEN 2.5
          WHEN p_rec.ign = 'Scump' THEN 2.5
          WHEN p_rec.ign = 'Dashy' THEN 1.5
          WHEN p_rec.ign = 'Pred' THEN 1.5
          ELSE 1.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_kills, CASE
          WHEN p_rec.ign = 'Shotzzy' THEN 9.5
          WHEN p_rec.ign = 'Scump' THEN 8.5
          WHEN p_rec.ign = 'Dashy' THEN 7.5
          WHEN p_rec.ign = 'Pred' THEN 7.5
          ELSE 8.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;
  END IF;

  -- ── Match 2: NYSL vs LAT (S&D) ──
  SELECT id INTO m_id FROM public.matches WHERE game = 'cod' AND status = 'upcoming'
    AND team_a_id = (SELECT id FROM teams WHERE abbrev = 'NYSL') LIMIT 1;

  IF m_id IS NOT NULL THEN
    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'NYSL') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'HyDra' THEN 27.5
          WHEN p_rec.ign = 'Sib' THEN 26.5
          WHEN p_rec.ign = 'KiSMET' THEN 24.5
          WHEN p_rec.ign = 'Skyz' THEN 23.5
          ELSE 25.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_kills, CASE
          WHEN p_rec.ign = 'HyDra' THEN 9.5
          WHEN p_rec.ign = 'Sib' THEN 8.5
          WHEN p_rec.ign = 'KiSMET' THEN 7.5
          WHEN p_rec.ign = 'Skyz' THEN 7.5
          ELSE 8.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_fb, CASE
          WHEN p_rec.ign = 'HyDra' THEN 3.5
          WHEN p_rec.ign = 'Sib' THEN 2.5
          WHEN p_rec.ign = 'KiSMET' THEN 1.5
          WHEN p_rec.ign = 'Skyz' THEN 1.5
          ELSE 2.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;

    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'LAT') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'Envoy' THEN 28.5
          WHEN p_rec.ign = 'Kenny' THEN 26.5
          WHEN p_rec.ign = 'Drazah' THEN 25.5
          WHEN p_rec.ign = 'Octane' THEN 24.5
          ELSE 26.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_kills, CASE
          WHEN p_rec.ign = 'Envoy' THEN 9.5
          WHEN p_rec.ign = 'Kenny' THEN 8.5
          WHEN p_rec.ign = 'Drazah' THEN 8.5
          WHEN p_rec.ign = 'Octane' THEN 7.5
          ELSE 8.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_fb, CASE
          WHEN p_rec.ign = 'Envoy' THEN 3.5
          WHEN p_rec.ign = 'Kenny' THEN 2.5
          WHEN p_rec.ign = 'Drazah' THEN 2.5
          WHEN p_rec.ign = 'Octane' THEN 1.5
          ELSE 2.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;
  END IF;

  -- ── Match 3: TOR vs BOS (Control) ──
  SELECT id INTO m_id FROM public.matches WHERE game = 'cod'
    AND team_a_id = (SELECT id FROM teams WHERE abbrev = 'TOR') LIMIT 1;

  IF m_id IS NOT NULL THEN
    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'TOR') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'CleanX' THEN 27.5
          WHEN p_rec.ign = 'Cammy' THEN 25.5
          WHEN p_rec.ign = 'Insight' THEN 24.5
          WHEN p_rec.ign = 'Bance' THEN 23.5
          ELSE 25.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_hp_kills, CASE
          WHEN p_rec.ign = 'CleanX' THEN 30.5
          WHEN p_rec.ign = 'Cammy' THEN 28.5
          WHEN p_rec.ign = 'Insight' THEN 27.5
          WHEN p_rec.ign = 'Bance' THEN 26.5
          ELSE 28.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;

    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'BOS') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'Huke' THEN 26.5
          WHEN p_rec.ign = 'Methodz' THEN 24.5
          WHEN p_rec.ign = 'Vivid' THEN 25.5
          WHEN p_rec.ign = 'Beans' THEN 23.5
          ELSE 25.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_hp_kills, CASE
          WHEN p_rec.ign = 'Huke' THEN 29.5
          WHEN p_rec.ign = 'Methodz' THEN 27.5
          WHEN p_rec.ign = 'Vivid' THEN 28.5
          WHEN p_rec.ign = 'Beans' THEN 26.5
          ELSE 28.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;
  END IF;

  -- ── Match 4: SEA vs MIN (Hardpoint) ──
  SELECT id INTO m_id FROM public.matches WHERE game = 'cod'
    AND team_a_id = (SELECT id FROM teams WHERE abbrev = 'SEA') LIMIT 1;

  IF m_id IS NOT NULL THEN
    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'SEA') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'Spart' THEN 26.5
          WHEN p_rec.ign = 'Mack' THEN 25.5
          WHEN p_rec.ign = 'Havok' THEN 24.5
          WHEN p_rec.ign = 'Accuracy' THEN 22.5
          ELSE 25.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_fb, CASE
          WHEN p_rec.ign = 'Spart' THEN 2.5
          WHEN p_rec.ign = 'Mack' THEN 2.5
          WHEN p_rec.ign = 'Havok' THEN 1.5
          WHEN p_rec.ign = 'Accuracy' THEN 1.5
          ELSE 1.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;

    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id = (SELECT id FROM teams WHERE abbrev = 'MIN') LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills, CASE
          WHEN p_rec.ign = 'Ghosty' THEN 25.5
          WHEN p_rec.ign = 'Brack' THEN 24.5
          WHEN p_rec.ign = 'Owakening' THEN 23.5
          WHEN p_rec.ign = 'KAP' THEN 22.5
          ELSE 24.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_sd_fb, CASE
          WHEN p_rec.ign = 'Ghosty' THEN 2.5
          WHEN p_rec.ign = 'Brack' THEN 2.5
          WHEN p_rec.ign = 'Owakening' THEN 1.5
          WHEN p_rec.ign = 'KAP' THEN 1.5
          ELSE 1.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;
  END IF;

  -- ── Match 5: ATL vs TOR (Sunday — Hardpoint) ──
  SELECT id INTO m_id FROM public.matches WHERE game = 'cod' AND status = 'SCHEDULED'
    AND team_a_id = (SELECT id FROM teams WHERE abbrev = 'ATL')
    AND team_b_id = (SELECT id FROM teams WHERE abbrev = 'TOR') LIMIT 1;

  IF m_id IS NOT NULL THEN
    FOR p_rec IN SELECT id, ign FROM public.players WHERE team_id IN (
      (SELECT id FROM teams WHERE abbrev = 'ATL'), (SELECT id FROM teams WHERE abbrev = 'TOR')
    ) LOOP
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, status, ml_confidence, ml_direction) VALUES
        (m_id, p_rec.id, pt_kills,
          (22 + floor(random()*8 + 0.5))::numeric,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END),
        (m_id, p_rec.id, pt_maps,
          CASE WHEN random() > 0.5 THEN 2.5 ELSE 1.5 END,
          'OPEN', (55 + floor(random()*30))::int,
          CASE WHEN random() > 0.5 THEN 'over' ELSE 'under' END);
    END LOOP;
  END IF;

END $$;
