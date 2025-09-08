import React from "react";
import dayjs from "dayjs";
import MatchCard from "../components/MatchCard";

type APIMatch = { id: string; start_time: string | null; team_a: { name: string }; team_b: { name: string } };

export default function Home() {
  const [date, setDate] = React.useState<string>(dayjs().format("YYYY-MM-DD"));
  // toast removed in favor of shadcn UI







  const [matches, setMatches] = React.useState<APIMatch[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [err, setErr] = React.useState<string | null>(null);

  async function fetchMatches() {
    try {
      setLoading(true);
      const r = await fetch("/api/matches");
      const j = await r.json();
      setMatches(j.matches || []);
  setErr(null);
    } catch (e: any) {
  setErr("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchMatches(); }, []);

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

        {matches.map((m) => (
          <MatchCard key={m.id} match={{ id: m.id, team_a: m.team_a?.name ?? "Team A", team_b: m.team_b?.name ?? "Team B", start_time: m.start_time }} />
        ))}
      </div>

  {/* BetSlip is global in Layout now */}
    </>
  );
}