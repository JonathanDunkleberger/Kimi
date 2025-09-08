import React from "react";
import dayjs from "dayjs";
import MatchCard from "../components/MatchCard";
import { createClient } from "@supabase/supabase-js";

type DBMatch = { id: string; starts_at: string; team1: { name: string } | null; team2: { name: string } | null };

const supabase = typeof window !== 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : (null as any);

export default function Home() {
  const [date, setDate] = React.useState<string>(dayjs().format("YYYY-MM-DD"));
  const [matches, setMatches] = React.useState<DBMatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function fetchMatches() {
    if (!supabase) return;
    try {
      setLoading(true);
      // Filter for matches starting today (UTC) & status SCHEDULED or LIVE
      const start = dayjs(date).startOf('day').toISOString();
      const end = dayjs(date).endOf('day').toISOString();
      const { data, error } = await supabase
        .from('matches')
        .select('id, starts_at, status, team1:team1_id(name), team2:team2_id(name)')
        .gte('starts_at', start)
        .lte('starts_at', end)
        .in('status', ['SCHEDULED','LIVE']);
      if (error) throw error;
      setMatches(data || []);
      setErr(null);
    } catch (e: any) {
      setErr('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchMatches(); }, [date]);

  return (
    <>
      <div className="">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
          <h2 style={{margin:"8px 0"}}>Today’s Board</h2>
          <div style={{display:"flex", gap:10}}>
            <input className="border rounded px-2 py-1 bg-background" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            <button className="btn" onClick={()=>fetchMatches()}>Refresh</button>
          </div>
        </div>

        {loading && <div className="card" style={{padding:16}}>Loading…</div>}
        {err && <div className="card" style={{padding:16, color:"var(--danger)"}}>{err}</div>}

        {matches.map(m => (
          <MatchCard key={m.id} match={{ id: m.id, team_a: m.team1?.name || 'Team A', team_b: m.team2?.name || 'Team B', start_time: m.starts_at }} />
        ))}
      </div>
    </>
  );
}