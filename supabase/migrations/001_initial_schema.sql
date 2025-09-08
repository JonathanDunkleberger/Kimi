-- 001_initial_schema.sql
-- Core tables for Valorant props engine

-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Events (optional)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  team_a_id uuid references public.teams(id) not null,
  team_b_id uuid references public.teams(id) not null,
  start_time timestamptz not null,
  status text not null default 'SCHEDULED',
  created_at timestamptz not null default now()
);

-- Prop types (e.g., Total Kills)
create table if not exists public.prop_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Prop lines
create table if not exists public.prop_lines (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  prop_type_id uuid not null references public.prop_types(id) on delete restrict,
  line_value numeric not null,
  over_odds numeric default 1.9,
  under_odds numeric default 1.9,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

-- User bets
create table if not exists public.user_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prop_line_id uuid not null references public.prop_lines(id) on delete cascade,
  selection text not null check (selection in ('over','under')),
  wager numeric not null check (wager > 0),
  status text not null default 'pending' check (status in ('pending','win','loss','void')),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_matches_start_time on public.matches(start_time);
create index if not exists idx_prop_lines_match on public.prop_lines(match_id);
create index if not exists idx_prop_lines_player on public.prop_lines(player_id);
create index if not exists idx_user_bets_user on public.user_bets(user_id);
