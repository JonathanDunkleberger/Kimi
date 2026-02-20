-- ═══════════════════════════════════════════════════════════════════════════
-- KIMI — Full Database Setup (migrations 001–006 combined)
-- Run this ONCE in Supabase SQL Editor to set up everything from scratch.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 001: Core tables ──────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  team_a_id UUID REFERENCES public.teams(id) NOT NULL,
  team_b_id UUID REFERENCES public.teams(id) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prop_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.prop_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  prop_type_id UUID NOT NULL REFERENCES public.prop_types(id) ON DELETE RESTRICT,
  line_value NUMERIC NOT NULL,
  over_odds NUMERIC DEFAULT 1.9,
  under_odds NUMERIC DEFAULT 1.9,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_line_id UUID NOT NULL REFERENCES public.prop_lines(id) ON DELETE CASCADE,
  selection TEXT NOT NULL CHECK (selection IN ('over','under')),
  wager NUMERIC NOT NULL CHECK (wager > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','win','loss','void')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_start_time ON public.matches(start_time);
CREATE INDEX IF NOT EXISTS idx_prop_lines_match ON public.prop_lines(match_id);
CREATE INDEX IF NOT EXISTS idx_prop_lines_player ON public.prop_lines(player_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_user ON public.user_bets(user_id);


-- ─── 002: Profiles & RLS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  balance NUMERIC NOT NULL DEFAULT 1000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prop_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow public read access" ON public.players FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow public read access" ON public.teams FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow public read access" ON public.matches FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow public read access" ON public.events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow public read access" ON public.prop_types FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow public read access" ON public.prop_lines FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow individual read access to own bets" ON public.user_bets
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow individual insert for own bets" ON public.user_bets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow users to see all profiles" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.prop_types (name) VALUES ('Total Kills') ON CONFLICT DO NOTHING;


-- ─── 003: Kimi v2 core schema ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_emoji TEXT DEFAULT 'KM',
  balance INTEGER NOT NULL DEFAULT 10000,
  total_wagered INTEGER DEFAULT 0,
  total_won INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'color') THEN
    ALTER TABLE public.teams ADD COLUMN color TEXT DEFAULT '#FF4655';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'region') THEN
    ALTER TABLE public.teams ADD COLUMN region TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'abbrev') THEN
    ALTER TABLE public.teams ADD COLUMN abbrev TEXT;
  END IF;
END $$;

-- Make abbrev unique if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'teams' AND indexname = 'teams_abbrev_key'
  ) THEN
    BEGIN
      ALTER TABLE public.teams ADD CONSTRAINT teams_abbrev_key UNIQUE (abbrev);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'ign') THEN
    ALTER TABLE public.players ADD COLUMN ign TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'role') THEN
    ALTER TABLE public.players ADD COLUMN role TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'photo_url') THEN
    ALTER TABLE public.players ADD COLUMN photo_url TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'map') THEN
    ALTER TABLE public.matches ADD COLUMN map TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'vlr_match_id') THEN
    ALTER TABLE public.matches ADD COLUMN vlr_match_id TEXT UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prop_lines' AND column_name = 'ml_confidence') THEN
    ALTER TABLE public.prop_lines ADD COLUMN ml_confidence INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prop_lines' AND column_name = 'ml_direction') THEN
    ALTER TABLE public.prop_lines ADD COLUMN ml_direction TEXT CHECK (ml_direction IN ('over', 'under'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prop_lines' AND column_name = 'actual_result') THEN
    ALTER TABLE public.prop_lines ADD COLUMN actual_result NUMERIC(6,1);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.entries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  wager INTEGER NOT NULL CHECK (wager >= 50),
  multiplier NUMERIC(4,1) NOT NULL,
  potential_payout INTEGER NOT NULL,
  actual_payout INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void', 'partial')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entry_legs (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER REFERENCES public.entries(id) ON DELETE CASCADE,
  prop_line_id UUID REFERENCES public.prop_lines(id),
  pick TEXT NOT NULL CHECK (pick IN ('over', 'under')),
  result TEXT CHECK (result IN ('won', 'lost', 'push', 'void')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settlement_events (
  id SERIAL PRIMARY KEY,
  prop_line_id UUID REFERENCES public.prop_lines(id),
  actual_result NUMERIC(6,1),
  settled_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_user ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_legs_entry ON public.entry_legs(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_legs_prop ON public.entry_legs(prop_line_id);

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  id, username, avatar_emoji, balance,
  wins, losses, current_streak,
  (balance - 10000) AS profit,
  CASE WHEN (wins + losses) > 0
    THEN ROUND(wins::NUMERIC / (wins + losses) * 100, 1)
    ELSE 0
  END AS win_rate,
  total_wagered, total_won
FROM public.users
ORDER BY balance DESC;

-- Seed VCT teams
INSERT INTO public.teams (name, abbrev, color, region) VALUES
  ('Sentinels',    'SEN',  '#C8102E', 'americas'),
  ('LOUD',         'LOUD', '#00FF87', 'americas'),
  ('DRX',          'DRX',  '#1E90FF', 'pacific'),
  ('Fnatic',       'FNC',  '#FF5900', 'emea'),
  ('Paper Rex',    'PRX',  '#FF4655', 'pacific'),
  ('NRG',          'NRG',  '#00C8FF', 'americas'),
  ('T1',           'T1',   '#E2012D', 'pacific'),
  ('Gen.G',        'GEN',  '#AA8B56', 'pacific'),
  ('100 Thieves',  '100T', '#FF0000', 'americas'),
  ('Cloud9',       'C9',   '#009BFF', 'americas'),
  ('Evil Geniuses','EG',   '#0E1E32', 'americas'),
  ('Team Liquid',  'TL',   '#001A3A', 'emea'),
  ('Karmine Corp', 'KC',   '#00A3FF', 'emea'),
  ('Team Heretics','TH',   '#FFD700', 'emea'),
  ('NAVI',         'NAVI', '#FFDE00', 'emea'),
  ('EDward Gaming','EDG',  '#E4002B', 'china')
ON CONFLICT (name) DO UPDATE SET
  abbrev = EXCLUDED.abbrev,
  color = EXCLUDED.color,
  region = EXCLUDED.region;


-- ─── 004: RPC functions ───────────────────────────────────────────────────

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


-- ─── 005: RLS for Kimi v2 tables ──────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "entries_select_own" ON public.entries FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "entries_insert_own" ON public.entries FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "entry_legs_select_own" ON public.entry_legs FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.entries WHERE entries.id = entry_legs.entry_id AND entries.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "settlement_events_select_all" ON public.settlement_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── 006: Call of Duty League ─────────────────────────────────────────────

-- Add game column to teams, players, matches
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'game') THEN
    ALTER TABLE public.teams ADD COLUMN game TEXT DEFAULT 'valorant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'game') THEN
    ALTER TABLE public.players ADD COLUMN game TEXT DEFAULT 'valorant';
  END IF;
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

-- CDL prop types
INSERT INTO public.prop_types (name) VALUES
  ('Kills'),
  ('Deaths'),
  ('K/D Ratio'),
  ('Damage'),
  ('Hardpoint Time'),
  ('SND First Bloods'),
  ('SND Kills'),
  ('Map 1 Kills'),
  ('Map 2 Kills'),
  ('Map 3 Kills'),
  ('Total Series Kills')
ON CONFLICT (name) DO NOTHING;

-- CDL 2025 Teams
INSERT INTO public.teams (name, abbrev, color, region, game) VALUES
  ('Atlanta FaZe',          'ATL',  '#E43D30', 'NA', 'cod'),
  ('New York Subliners',    'NYSL', '#171C38', 'NA', 'cod'),
  ('OpTic Texas',           'OTX',  '#92C83E', 'NA', 'cod'),
  ('Toronto Ultra',         'TOR',  '#773DBD', 'NA', 'cod'),
  ('Minnesota ROKKR',       'MIN',  '#351F67', 'NA', 'cod'),
  ('Los Angeles Thieves',   'LAT',  '#FF0043', 'NA', 'cod'),
  ('Los Angeles Guerrillas','LAG',  '#60269E', 'NA', 'cod'),
  ('Seattle Surge',         'SEA',  '#00B2A9', 'NA', 'cod'),
  ('Carolina Royal Ravens', 'CAR',  '#2C519F', 'NA', 'cod'),
  ('Miami Heretics',        'MIA',  '#E35205', 'NA', 'cod'),
  ('Vegas Falcons',         'VGS',  '#C5B358', 'NA', 'cod'),
  ('Cloud9 New York',       'C9NY', '#009BFF', 'NA', 'cod')
ON CONFLICT (name) DO UPDATE SET
  abbrev = EXCLUDED.abbrev,
  color = EXCLUDED.color,
  region = EXCLUDED.region,
  game = EXCLUDED.game;

-- CDL Players (real 2025 rosters)
-- Atlanta FaZe
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Chris Cuevas',      'Simp',     'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='ATL')),
  ('Tyler Pharris',     'aBeZy',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='ATL')),
  ('Alec Sanderson',    'Arcitys',  'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='ATL')),
  ('McArthur Jovel',    'Cellium',  'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='ATL')),
  ('Dillon Price',      'Attach',   'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='ATL'))
ON CONFLICT DO NOTHING;

-- OpTic Texas
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Seth Abner',        'Scump',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='OTX')),
  ('Anthony Cuevas-Castro','Shotzzy','SMG','cod', (SELECT id FROM public.teams WHERE abbrev='OTX')),
  ('Brandon Dashy',     'Dashy',    'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='OTX')),
  ('Indervir Dhaliwal', 'iLLeY',    'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='OTX')),
  ('Kenneth Williams',  'Kenny',    'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='OTX'))
ON CONFLICT DO NOTHING;

-- New York Subliners
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Paco Rusiewiez',    'HyDra',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='NYSL')),
  ('Matthew Mochak',    'KiSMET',   'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='NYSL')),
  ('Caesar Skuratovich','Skyz',     'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='NYSL')),
  ('James Crowder',     'Proximity','SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='NYSL'))
ON CONFLICT DO NOTHING;

-- Toronto Ultra
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Ben Bance',         'Bance',    'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='TOR')),
  ('Cameron Lowe',      'Cammy',    'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='TOR')),
  ('Thomas Paparatto',  'ThomasHD', 'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='TOR')),
  ('Tobias Foster',     'CleanX',   'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='TOR')),
  ('Nicholas Rivero',   'Insight',  'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='TOR'))
ON CONFLICT DO NOTHING;

-- Los Angeles Thieves
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Sam Octane',        'Octane',   'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='LAT')),
  ('Dylan Henderson',   'Envoy',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='LAT')),
  ('Zach Denyer',       'Venom',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='LAT')),
  ('Amer Zulbeari',     'Pred',     'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='LAT'))
ON CONFLICT DO NOTHING;

-- Seattle Surge
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Daunte Gray',       'Sib',      'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='SEA')),
  ('Lamar Abedi',       'Accuracy', 'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='SEA')),
  ('Cole Burkett',      'Havok',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='SEA')),
  ('Reece Drost',       'Vivid',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='SEA'))
ON CONFLICT DO NOTHING;

-- Minnesota ROKKR
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Damon Barlow',      'Karma',    'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='MIN')),
  ('Justin Fargo-Palmer','JurNii',  'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='MIN')),
  ('Michael Stokes',    'MajorManiak','AR','cod', (SELECT id FROM public.teams WHERE abbrev='MIN')),
  ('Eli Brinkman',      'Standy',   'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='MIN'))
ON CONFLICT DO NOTHING;

-- Carolina Royal Ravens
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Trei Morris',       'Zer0',     'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='CAR')),
  ('Caden Imdieke',     'Exceed',   'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='CAR')),
  ('Byron Mayfield',    'Nastie',   'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='CAR')),
  ('Harry Sherwood',    'Harry',    'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='CAR'))
ON CONFLICT DO NOTHING;

-- Los Angeles Guerrillas
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Mathew Fiorante',   'Royalty',  'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='LAG')),
  ('Kris Sliwka',       'Spart',   'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='LAG')),
  ('Javier Milagro',    'Lucky',   'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='LAG')),
  ('Makenzie Kelley',   'Mack',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='LAG'))
ON CONFLICT DO NOTHING;

-- Miami Heretics
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('David Crespo',      'Davpadie',  'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='MIA')),
  ('Juan Puerta',       'JurNii_MIA','SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='MIA')),
  ('Adrian Villar',     'MettalZ',   'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='MIA')),
  ('Lucky Chamu',       'Lucky_MIA', 'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='MIA'))
ON CONFLICT DO NOTHING;

-- Vegas Falcons
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Chance Posey',      'Snoopy',   'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='VGS')),
  ('Donovan John',      'Temp',     'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='VGS')),
  ('Bryan Berrios',     'Pentagrxm','SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='VGS')),
  ('Adam Sloss',        'GodRx',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='VGS'))
ON CONFLICT DO NOTHING;

-- Cloud9 New York
INSERT INTO public.players (name, ign, role, game, team_id) VALUES
  ('Ian Porter',        'Crimsix',  'AR',  'cod', (SELECT id FROM public.teams WHERE abbrev='C9NY')),
  ('Jett Mantripp',     'Beans',    'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='C9NY')),
  ('Drazah Ahmed',      'Drazah',   'Flex','cod', (SELECT id FROM public.teams WHERE abbrev='C9NY')),
  ('Cuyler Garland',    'Huke',     'SMG', 'cod', (SELECT id FROM public.teams WHERE abbrev='C9NY'))
ON CONFLICT DO NOTHING;

-- CDL Event
INSERT INTO public.events (name, start_date, end_date) VALUES
  ('CDL Major 4', '2026-02-20', '2026-02-23')
ON CONFLICT DO NOTHING;

-- CDL Matches (today's schedule)
INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
SELECT
  (SELECT id FROM public.events WHERE name = 'CDL Major 4'),
  (SELECT id FROM public.teams WHERE abbrev = 'ATL'),
  (SELECT id FROM public.teams WHERE abbrev = 'OTX'),
  '2026-02-20 18:00:00-05'::TIMESTAMPTZ,
  'upcoming', 'cod', 'Hardpoint', 'BO5', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.matches WHERE team_a_id = (SELECT id FROM public.teams WHERE abbrev='ATL')
    AND team_b_id = (SELECT id FROM public.teams WHERE abbrev='OTX') AND game = 'cod'
);

INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
SELECT
  (SELECT id FROM public.events WHERE name = 'CDL Major 4'),
  (SELECT id FROM public.teams WHERE abbrev = 'NYSL'),
  (SELECT id FROM public.teams WHERE abbrev = 'TOR'),
  '2026-02-20 19:30:00-05'::TIMESTAMPTZ,
  'upcoming', 'cod', 'Hardpoint', 'BO5', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.matches WHERE team_a_id = (SELECT id FROM public.teams WHERE abbrev='NYSL')
    AND team_b_id = (SELECT id FROM public.teams WHERE abbrev='TOR') AND game = 'cod'
);

INSERT INTO public.matches (event_id, team_a_id, team_b_id, start_time, status, game, game_mode, series_format, map)
SELECT
  (SELECT id FROM public.events WHERE name = 'CDL Major 4'),
  (SELECT id FROM public.teams WHERE abbrev = 'LAT'),
  (SELECT id FROM public.teams WHERE abbrev = 'SEA'),
  '2026-02-20 21:00:00-05'::TIMESTAMPTZ,
  'upcoming', 'cod', 'Hardpoint', 'BO5', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.matches WHERE team_a_id = (SELECT id FROM public.teams WHERE abbrev='LAT')
    AND team_b_id = (SELECT id FROM public.teams WHERE abbrev='SEA') AND game = 'cod'
);

-- Prop lines for CDL matches
DO $$
DECLARE
  v_match_id UUID;
  v_player_id UUID;
  v_pt_kills UUID;
  v_pt_snd_fb UUID;
  v_pt_snd_k UUID;
  v_pt_m1k UUID;
  v_pt_m2k UUID;
  v_pt_m3k UUID;
  v_pt_series UUID;
  v_pt_damage UUID;
  v_pt_hp UUID;
BEGIN
  SELECT id INTO v_pt_kills FROM public.prop_types WHERE name = 'Kills';
  SELECT id INTO v_pt_snd_fb FROM public.prop_types WHERE name = 'SND First Bloods';
  SELECT id INTO v_pt_snd_k FROM public.prop_types WHERE name = 'SND Kills';
  SELECT id INTO v_pt_m1k FROM public.prop_types WHERE name = 'Map 1 Kills';
  SELECT id INTO v_pt_m2k FROM public.prop_types WHERE name = 'Map 2 Kills';
  SELECT id INTO v_pt_m3k FROM public.prop_types WHERE name = 'Map 3 Kills';
  SELECT id INTO v_pt_series FROM public.prop_types WHERE name = 'Total Series Kills';
  SELECT id INTO v_pt_damage FROM public.prop_types WHERE name = 'Damage';
  SELECT id INTO v_pt_hp FROM public.prop_types WHERE name = 'Hardpoint Time';

  -- === ATL vs OTX ===
  SELECT id INTO v_match_id FROM public.matches
    WHERE team_a_id = (SELECT id FROM public.teams WHERE abbrev='ATL')
      AND team_b_id = (SELECT id FROM public.teams WHERE abbrev='OTX') AND game = 'cod' LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    -- Simp
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Simp' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 24.5, 72, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_snd_fb, 2.5, 68, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_m1k, 8.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_series, 110.5, 65, 'under', 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- aBeZy
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'aBeZy' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 22.5, 70, 'under', 'OPEN'),
        (v_match_id, v_player_id, v_pt_snd_k, 4.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_m2k, 7.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Cellium
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Cellium' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 25.5, 75, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_damage, 3200.5, 60, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_m1k, 9.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_m3k, 8.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Scump
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Scump' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 23.5, 67, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_snd_fb, 3.5, 71, 'under', 'OPEN'),
        (v_match_id, v_player_id, v_pt_series, 105.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Shotzzy
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Shotzzy' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 21.5, 64, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_hp, 45.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_m1k, 7.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Dashy
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Dashy' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 26.5, 73, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_damage, 3400.5, 66, 'under', 'OPEN'),
        (v_match_id, v_player_id, v_pt_m2k, 9.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_m3k, 9.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- === NYSL vs TOR ===
  SELECT id INTO v_match_id FROM public.matches
    WHERE team_a_id = (SELECT id FROM public.teams WHERE abbrev='NYSL')
      AND team_b_id = (SELECT id FROM public.teams WHERE abbrev='TOR') AND game = 'cod' LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    -- HyDra
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'HyDra' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 25.5, 74, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_snd_fb, 3.5, 68, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_m1k, 9.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- KiSMET
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'KiSMET' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 24.5, 69, 'under', 'OPEN'),
        (v_match_id, v_player_id, v_pt_damage, 3100.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Cammy
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Cammy' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 23.5, 66, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_snd_k, 5.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_m2k, 8.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- CleanX
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'CleanX' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 22.5, 63, 'under', 'OPEN'),
        (v_match_id, v_player_id, v_pt_hp, 50.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_series, 100.5, 61, 'under', 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- === LAT vs SEA ===
  SELECT id INTO v_match_id FROM public.matches
    WHERE team_a_id = (SELECT id FROM public.teams WHERE abbrev='LAT')
      AND team_b_id = (SELECT id FROM public.teams WHERE abbrev='SEA') AND game = 'cod' LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    -- Envoy
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Envoy' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 24.5, 70, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_snd_fb, 2.5, 65, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_m1k, 8.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_m3k, 8.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Octane
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Octane' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 23.5, 67, 'over', 'OPEN'),
        (v_match_id, v_player_id, v_pt_damage, 3300.5, 62, 'over', 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Sib
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Sib' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 22.5, 71, 'under', 'OPEN'),
        (v_match_id, v_player_id, v_pt_snd_k, 4.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_m2k, 7.5, NULL, NULL, 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Accuracy
    SELECT id INTO v_player_id FROM public.players WHERE ign = 'Accuracy' LIMIT 1;
    IF v_player_id IS NOT NULL THEN
      INSERT INTO public.prop_lines (match_id, player_id, prop_type_id, line_value, ml_confidence, ml_direction, status) VALUES
        (v_match_id, v_player_id, v_pt_kills, 21.5, 64, 'under', 'OPEN'),
        (v_match_id, v_player_id, v_pt_hp, 55.5, NULL, NULL, 'OPEN'),
        (v_match_id, v_player_id, v_pt_series, 95.5, 60, 'over', 'OPEN')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! All tables, functions, policies, and seed data created.
-- ═══════════════════════════════════════════════════════════════════════════
