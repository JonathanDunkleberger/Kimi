import React from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Lock, Shield } from "lucide-react";

type Team = { id: string; name: string };
type Player = { id: string; name: string };
type Match = { id: string; start_time: string };

export default function Admin() {
  const { user } = useProfile();

  const [teams, setTeams] = React.useState<Team[]>([]);
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [matches, setMatches] = React.useState<Match[]>([]);

  React.useEffect(() => {
    async function load() {
      const [t, p, m] = await Promise.all([
        supabase.from("teams").select("id,name").order("name"),
        supabase.from("players").select("id,name").order("name"),
        supabase.from("matches").select("id,start_time").order("start_time")
      ]);
      if (!t.error && t.data) setTeams(t.data);
      if (!p.error && p.data) setPlayers(p.data);
      if (!m.error && m.data) setMatches(m.data);
    }
    load();
  }, []);

  if (!user) {
    return (
      <div className="entries-empty anim-in">
        <div style={{ marginBottom: 12 }}><Lock size={36} /></div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Sign in to access Admin</div>
        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
          You must be signed in to manage teams, players, and matches.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container anim-in">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Shield size={20} style={{ color: 'var(--accent)' }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, fontFamily: 'var(--font)' }}>Admin</h2>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Create teams, players, matches, and prop lines.
        </div>
      </div>

      <CreateTeam onCreated={() => window.location.reload()} />
      <CreatePlayer teams={teams} onCreated={() => window.location.reload()} />
      <CreateMatch teams={teams} onCreated={() => window.location.reload()} />
      <CreatePropLine matches={matches} players={players} onCreated={() => window.location.reload()} />
    </div>
  );
}

function CreateTeam(props: { onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [logo, setLogo] = React.useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/create-team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, logo_url: logo }) });
    setName(""); setLogo(""); props.onCreated();
  }
  return (
    <form onSubmit={submit} className="admin-card">
      <h3>Create Team</h3>
      <input className="admin-input" placeholder="Team name" value={name} onChange={(e)=>setName(e.target.value)} required />
      <input className="admin-input" placeholder="Logo URL (optional)" value={logo} onChange={(e)=>setLogo(e.target.value)} />
      <button className="admin-btn" type="submit">Create Team</button>
    </form>
  );
}

function CreatePlayer(props: { teams: Team[]; onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [teamId, setTeamId] = React.useState<string>("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/create-player", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, team_id: teamId || undefined }) });
    setName(""); setTeamId(""); props.onCreated();
  }
  return (
    <form onSubmit={submit} className="admin-card">
      <h3>Create Player</h3>
      <input className="admin-input" placeholder="Player name" value={name} onChange={(e)=>setName(e.target.value)} required />
      <select className="admin-select" value={teamId} onChange={(e)=>setTeamId(e.target.value)}>
        <option value="">— No team —</option>
        {props.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button className="admin-btn" type="submit">Create Player</button>
    </form>
  );
}

function CreateMatch(props: { teams: Team[]; onCreated: () => void }) {
  const [teamA, setTeamA] = React.useState<string>("");
  const [teamB, setTeamB] = React.useState<string>("");
  const [start, setStart] = React.useState<string>("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/create-match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ team_a_id: teamA, team_b_id: teamB, start_time: start }) });
    setTeamA(""); setTeamB(""); setStart(""); props.onCreated();
  }
  return (
    <form onSubmit={submit} className="admin-card">
      <h3>Create Match</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select className="admin-select" value={teamA} onChange={(e)=>setTeamA(e.target.value)} required>
          <option value="">— Team A —</option>
          {props.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="admin-select" value={teamB} onChange={(e)=>setTeamB(e.target.value)} required>
          <option value="">— Team B —</option>
          {props.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <input className="admin-input" type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} required />
      <button className="admin-btn" type="submit">Create Match</button>
    </form>
  );
}

function CreatePropLine(props: { matches: Match[]; players: Player[]; onCreated: () => void }) {
  const [matchId, setMatchId] = React.useState<string>("");
  const [playerId, setPlayerId] = React.useState<string>("");
  const [propType, setPropType] = React.useState<string>("Total Kills");
  const [value, setValue] = React.useState<string>("");
  const [over, setOver] = React.useState<string>("1.9");
  const [under, setUnder] = React.useState<string>("1.9");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/create-prop-line", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      match_id: matchId, player_id: playerId, prop_type_name: propType, line_value: parseFloat(value), over_odds: parseFloat(over), under_odds: parseFloat(under)
    }) });
    setMatchId(""); setPlayerId(""); setPropType("Total Kills"); setValue(""); setOver("1.9"); setUnder("1.9"); props.onCreated();
  }
  return (
    <form onSubmit={submit} className="admin-card">
      <h3>Create Prop Line</h3>
      <select className="admin-select" value={matchId} onChange={(e)=>setMatchId(e.target.value)} required>
        <option value="">— Match —</option>
        {props.matches.map(m => <option key={m.id} value={m.id}>{new Date(m.start_time).toLocaleString()}</option>)}
      </select>
      <select className="admin-select" value={playerId} onChange={(e)=>setPlayerId(e.target.value)} required>
        <option value="">— Player —</option>
        {props.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input className="admin-input" placeholder="Prop type (e.g., Total Kills)" value={propType} onChange={(e)=>setPropType(e.target.value)} required />
      <input className="admin-input" placeholder="Line value (e.g., 45.5)" value={value} onChange={(e)=>setValue(e.target.value)} required />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input className="admin-input" placeholder="Over odds" value={over} onChange={(e)=>setOver(e.target.value)} />
        <input className="admin-input" placeholder="Under odds" value={under} onChange={(e)=>setUnder(e.target.value)} />
      </div>
      <button className="admin-btn" type="submit">Create Prop Line</button>
    </form>
  );
}