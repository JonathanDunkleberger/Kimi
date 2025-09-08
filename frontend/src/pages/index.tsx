import React from "react";
import dayjs from "dayjs";
import MatchCard from "../components/MatchCard";

type DBMatch = { id: string; starts_at: string; team_a?: { name: string } | null; team_b?: { name: string } | null };

export default function Home() {
  const [matches, setMatches] = React.useState<DBMatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function fetchMatches() {
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!baseUrl || !anon) throw new Error("Missing Supabase env vars");
  const start = dayjs().toISOString();
  const end = dayjs().add(7, 'day').toISOString();
      // Build query params for RLS-safe filtering (eq, gte, lte, in status)
      const url = new URL(`${baseUrl}/rest/v1/matches`);
      url.searchParams.set('select', 'id,starts_at,status,team_a:team_a_id(name),team_b:team_b_id(name)');
      url.searchParams.set('starts_at', `gte.${start}`);
      url.searchParams.set('starts_at', `lte.${end}`); // overridden if duplicate; adjust using and/or alternative
      // Use range filtering differently: need two parameters; use gte and lte encoded differently
      // We'll append manually for both conditions
      url.searchParams.delete('starts_at');
      url.search += `&starts_at=gte.${encodeURIComponent(start)}&starts_at=lte.${encodeURIComponent(end)}`;
      url.search += `&status=in.(SCHEDULED,LIVE)`;
      const resp = await fetch(url.toString(), {
        headers: {
          'apikey': anon,
          'Authorization': `Bearer ${anon}`,
        },
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data: DBMatch[] = await resp.json();
      setMatches(data || []);
      setErr(null);
    } catch (e: any) {
      setErr('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchMatches(); }, []);

  return (
    <>
      <div className="">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
          <h2 style={{margin:"8px 0"}}>Upcoming (Next 7 Days)</h2>
          <div style={{display:"flex", gap:10}}>
            <button className="btn" onClick={()=>fetchMatches()}>Refresh</button>
          </div>
        </div>

        {loading && <div className="card" style={{padding:16}}>Loading…</div>}
        {err && <div className="card" style={{padding:16, color:"var(--danger)"}}>{err}</div>}

        {matches.map(m => (
          <MatchCard key={m.id} match={{ id: m.id, team_a: m.team_a?.name || 'Team A', team_b: m.team_b?.name || 'Team B', start_time: m.starts_at }} />
        ))}
      </div>
    </>
  );
}