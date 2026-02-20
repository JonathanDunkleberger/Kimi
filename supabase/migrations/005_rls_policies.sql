-- 005_rls_policies.sql
-- Row Level Security for Kimi v2 tables

-- ─── Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_legs ENABLE ROW LEVEL SECURITY;

-- ─── Users: everyone can read (leaderboard), only own row editable ──────────
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ─── Entries: users see only their own ──────────────────────────────────────
CREATE POLICY "entries_select_own" ON public.entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "entries_insert_own" ON public.entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Entry legs: users see legs for their own entries ───────────────────────
CREATE POLICY "entry_legs_select_own" ON public.entry_legs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.entries
    WHERE entries.id = entry_legs.entry_id AND entries.user_id = auth.uid()
  ));

-- ─── Settlement events: public read ─────────────────────────────────────────
ALTER TABLE public.settlement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settlement_events_select_all" ON public.settlement_events FOR SELECT USING (true);
