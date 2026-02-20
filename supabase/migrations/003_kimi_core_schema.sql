-- 003_kimi_core_schema.sql
-- Rebuild core schema for Kimi v2: fantasy Valorant props with K-Coins

-- ─── Users table (extends Supabase auth.users) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ─── Drop old tables if migrating from v1 ──────────────────────────────────
-- (Only run manually if you want a clean slate — commented out for safety)
-- DROP TABLE IF EXISTS public.user_bets CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ─── Teams ──────────────────────────────────────────────────────────────────
-- Add color + region columns to existing teams table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'color') THEN
    ALTER TABLE public.teams ADD COLUMN color TEXT DEFAULT '#FF4655';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'region') THEN
    ALTER TABLE public.teams ADD COLUMN region TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'abbrev') THEN
    ALTER TABLE public.teams ADD COLUMN abbrev TEXT UNIQUE;
  END IF;
END $$;

-- ─── Players ────────────────────────────────────────────────────────────────
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

-- ─── Matches — add missing columns ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'map') THEN
    ALTER TABLE public.matches ADD COLUMN map TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'vlr_match_id') THEN
    ALTER TABLE public.matches ADD COLUMN vlr_match_id TEXT UNIQUE;
  END IF;
END $$;

-- ─── Prop lines — add ML columns ───────────────────────────────────────────
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

-- ─── Entries (parlays / slips) ──────────────────────────────────────────────
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

-- ─── Entry legs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.entry_legs (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER REFERENCES public.entries(id) ON DELETE CASCADE,
  prop_line_id UUID REFERENCES public.prop_lines(id),
  pick TEXT NOT NULL CHECK (pick IN ('over', 'under')),
  result TEXT CHECK (result IN ('won', 'lost', 'push', 'void')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Settlement events log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settlement_events (
  id SERIAL PRIMARY KEY,
  prop_line_id UUID REFERENCES public.prop_lines(id),
  actual_result NUMERIC(6,1),
  settled_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entries_user ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_legs_entry ON public.entry_legs(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_legs_prop ON public.entry_legs(prop_line_id);

-- ─── Leaderboard view ──────────────────────────────────────────────────────
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

-- ─── Seed VCT teams ────────────────────────────────────────────────────────
INSERT INTO public.teams (name, abbrev, color, region) VALUES
  ('Sentinels',  'SEN',  '#C8102E', 'americas'),
  ('LOUD',       'LOUD', '#00FF87', 'americas'),
  ('DRX',        'DRX',  '#1E90FF', 'pacific'),
  ('Fnatic',     'FNC',  '#FF5900', 'emea'),
  ('Paper Rex',  'PRX',  '#FF4655', 'pacific'),
  ('NRG',        'NRG',  '#00C8FF', 'americas'),
  ('T1',         'T1',   '#E2012D', 'pacific'),
  ('Gen.G',      'GEN',  '#AA8B56', 'pacific'),
  ('100 Thieves','100T', '#FF0000', 'americas'),
  ('Cloud9',     'C9',   '#009BFF', 'americas'),
  ('Evil Geniuses','EG', '#0E1E32', 'americas'),
  ('Team Liquid','TL',   '#001A3A', 'emea'),
  ('Karmine Corp','KC',  '#00A3FF', 'emea'),
  ('Team Heretics','TH', '#FFD700', 'emea'),
  ('NAVI',       'NAVI', '#FFDE00', 'emea'),
  ('EDward Gaming','EDG','#E4002B', 'china')
ON CONFLICT (name) DO UPDATE SET
  abbrev = EXCLUDED.abbrev,
  color = EXCLUDED.color,
  region = EXCLUDED.region;
