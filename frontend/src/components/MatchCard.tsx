import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { BoardMatch } from "../lib/api";
import PlayerPropRow, { Selection } from "./PlayerPropRow";

const LOCK_MIN = parseInt(process.env.NEXT_PUBLIC_LOCK_WINDOW_MIN || "5", 10);

function fmtDelta(ms: number) {
  if (ms <= 0) return "Locked";
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const ss = s%60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${ss}s`;
}

export default function MatchCard(props: {
  match: BoardMatch;
  selections: Record<string, Selection | undefined>;
  onChange: (lineId: string, sel: Selection | null) => void;
  focusedLineId?: string;
}) {
  const { match, selections, onChange, focusedLineId } = props;
  const [now, setNow] = useState<number>(()=>Date.now());
  useEffect(()=>{
    const id = setInterval(()=>setNow(Date.now()), 1000);
    return ()=>clearInterval(id);
  }, []);

  const startsAt = useMemo(()=>new Date(match.starts_at).getTime(), [match.starts_at]);
  const lockAt = startsAt - LOCK_MIN*60*1000;
  const delta = lockAt - now;
  const locked = delta <= 0;

  return (
    <div className="card match">
      <div className="card-header">
        <div>
          <h3>{match.team1 ?? "TBD"} <span style={{color:"var(--muted)"}}>vs</span> {match.team2 ?? "TBD"}</h3>
          <div className="meta">
            {match.event} • {match.format} • {dayjs(match.starts_at).format("MMM D, HH:mm")} UTC
          </div>
        </div>
        <span className="badge" style={{background: locked ? "rgba(255,107,107,0.18)" : undefined, borderColor: locked ? "rgba(255,107,107,0.4)" : undefined}}>
          {locked ? "LOCKED" : `Locks in ${fmtDelta(delta)}`}
        </span>
      </div>
      <div className="card-body">
        {match.lines.length === 0 && <div style={{padding:"12px 14px", color:"var(--muted)"}}>No lines yet.</div>}
        {match.lines.map(line => (
          <PlayerPropRow
            key={line.line_id}
            line={line}
            locked={locked || line.status !== "OPEN"}
            selected={selections[line.line_id] ?? null}
            focused={focusedLineId === line.line_id}
            onToggle={(s)=>onChange(line.line_id, s)}
          />
        ))}
      </div>
    </div>
  );
}