-- 002_profiles_and_rls.sql
-- Profiles, trigger, and Row Level Security policies

-- Enable pgcrypto for gen_random_uuid if not already
create extension if not exists pgcrypto;

-- Profiles table for public user data and balances
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  balance numeric not null default 1000.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable RLS on all relevant tables
alter table public.players enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.events enable row level security;
alter table public.prop_types enable row level security;
alter table public.prop_lines enable row level security;
alter table public.user_bets enable row level security;
alter table public.profiles enable row level security;

-- Public read policies for non-sensitive entities
create policy "Allow public read access" on public.players for select using (true);
create policy "Allow public read access" on public.teams for select using (true);
create policy "Allow public read access" on public.matches for select using (true);
create policy "Allow public read access" on public.events for select using (true);
create policy "Allow public read access" on public.prop_types for select using (true);
create policy "Allow public read access" on public.prop_lines for select using (true);

-- Bets: users can read/insert their own
create policy "Allow individual read access to own bets" on public.user_bets
for select using (auth.uid() = user_id);

create policy "Allow individual insert for own bets" on public.user_bets
for insert with check (auth.uid() = user_id);

-- Profiles: anyone can read; users can update their own
create policy "Allow users to see all profiles" on public.profiles for select using (true);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Simple prop types seed
insert into public.prop_types (name)
values ('Total Kills')
on conflict do nothing;
