-- Add pandascore_id columns for idempotent syncing with PandaScore API

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'pandascore_id') THEN
    ALTER TABLE public.teams ADD COLUMN pandascore_id INTEGER UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'pandascore_id') THEN
    ALTER TABLE public.players ADD COLUMN pandascore_id INTEGER UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'pandascore_id') THEN
    ALTER TABLE public.matches ADD COLUMN pandascore_id INTEGER UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'pandascore_id') THEN
    ALTER TABLE public.events ADD COLUMN pandascore_id INTEGER UNIQUE;
  END IF;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_teams_pandascore ON public.teams(pandascore_id);
CREATE INDEX IF NOT EXISTS idx_players_pandascore ON public.players(pandascore_id);
CREATE INDEX IF NOT EXISTS idx_matches_pandascore ON public.matches(pandascore_id);
