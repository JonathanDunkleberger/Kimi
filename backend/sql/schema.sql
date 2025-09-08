-- === Extensions =============================================================

-- Use gen_random_uuid(); available via pgcrypto
create extension if not exists pgcrypto;
-- If you prefer uuid_generate_v4() instead, you can also:
create extension if not exists "uuid-ossp";

-- === Tables ================================================================

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  credits integer not null default 1000,
  created_at timestamptz not null default now()
);

-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  liquipedia_slug text,
  vlr_slug text
);
create index if not exists idx_teams_name on public.teams(name);

-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  team_id uuid references public.teams(id) on delete set null,
  liquipedia_slug text,
  vlr_slug text,
  active boolean not null default true
);
create index if not exists idx_players_handle on public.players(handle);
create index if not exists idx_players_team on public.players(team_id);

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  ext_id text unique,
  starts_at timestamptz not null,
  format text not null,                 -- e.g. 'BO3'
  event_name text not null,
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  status text not null default 'SCHEDULED', -- SCHEDULED|LIVE|FINAL
  liquipedia_url text,
  vlr_url text,
  roster_lock_snapshot_json jsonb
);
create index if not exists idx_matches_starts_at on public.matches(starts_at);
create index if not exists idx_matches_status on public.matches(status);

-- Player map stats (bronze-level)
create table if not exists public.player_map_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  map_name text not null,
  rounds integer not null,
  kills integer not null,
  assists integer,
  first_kills integer,
  acs integer,
  side_splits_json jsonb,
  source_raw_blob text,
  ingested_at timestamptz not null default now()
);
create index if not exists idx_pms_match on public.player_map_stats(match_id);
create index if not exists idx_pms_player on public.player_map_stats(player_id);

-- Features (silver)
create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  rolling_kpr_14d double precision,
  opp_def_strength double precision,
  exp_maps double precision,
  exp_rounds_per_map double precision,
  map_effects_json jsonb,
  epoch_label text,
  generated_at timestamptz not null default now()
);
create index if not exists idx_features_match on public.features(match_id);
create index if not exists idx_features_player on public.features(player_id);

-- Predictions (gold)
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  stat text not null,       -- 'kills_match'
  dist text not null,       -- 'negbin'
  mu double precision not null,
  alpha double precision not null,
  q10 double precision not null,
  q50 double precision not null,
  q90 double precision not null,
  model_version text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_predictions_match on public.predictions(match_id);
create index if not exists idx_predictions_player on public.predictions(player_id);

-- Lines (board)
create table if not exists public.lines (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  stat text not null,                     -- 'kills_match'
  line_value double precision not null,
  p_over double precision not null,
  shade_bps integer not null default 150,
  status text not null default 'OPEN',    -- OPEN|FROZEN|PULLED|SETTLED
  posted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One line per player-match-stat (enforced)
create unique index if not exists uq_lines_player_match_stat
  on public.lines(player_id, match_id, stat);
create index if not exists idx_lines_match on public.lines(match_id);
create index if not exists idx_lines_player on public.lines(player_id);

-- Entries
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stake integer not null,
  payout_rule text not null,              -- '2LEG_3X' | '3LEG_5X'
  legs_json jsonb not null,               -- [{ line_id, player_id, match_id, stat, side, line_value, ... }]
  status text not null default 'OPEN',    -- OPEN|WON|LOST|CANCELLED
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  settlement_note text
);
create index if not exists idx_entries_user on public.entries(user_id);
create index if not exists idx_entries_status on public.entries(status);

-- Settlement events
create table if not exists public.settlement_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  line_id uuid not null references public.lines(id) on delete cascade,
  result text not null,                   -- OVER|UNDER|VOID
  player_final integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_settle_entry on public.settlement_events(entry_id);

-- === Demo-friendly policies =================================================
-- For a public demo with your own auth in FastAPI, easiest is to DISABLE RLS.
-- (In a serious prod, you'd enable RLS and write policies.)
alter table public.users               disable row level security;
alter table public.teams               disable row level security;
alter table public.players             disable row level security;
alter table public.matches             disable row level security;
alter table public.player_map_stats    disable row level security;
alter table public.features            disable row level security;
alter table public.predictions         disable row level security;
alter table public.lines               disable row level security;
alter table public.entries             disable row level security;
alter table public.settlement_events   disable row level security;

-- === Helpful seed (optional) ===============================================
-- insert into public.users(username, password_hash, credits)
-- values ('demo', '$2b$12$Q1/l0Zc9...bcrypt-hash...', 1000);
