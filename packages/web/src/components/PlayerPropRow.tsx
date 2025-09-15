import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { Projection } from "../lib/api";

export type Selection = {
  line_id: string;
  player: string;
  team?: string | null;
  line_value: number;
  side: "MORE" | "LESS";
};

// Adapt Projection to line shape expected by this component.
// Projection: { id, statType, value, player: { id, name, team, imageUrl? } }
type LineLike = Projection & { line_id?: string; line_value?: number; playerName?: string };

export default function PlayerPropRow(props: {
  line: LineLike;
  selected?: Selection | null;
  onToggle: (sel: Selection | null) => void;
  locked?: boolean;
  focused?: boolean;
}) {
  const { line, selected, locked, focused } = props;
  const lineId = line.line_id || line.id;
  const playerName = (line as any).player?.name || (line as any).playerName || (line as any).player || "Player";
  const team = (line as any).player?.team || (line as any).team || null;
  const lineValue = line.line_value ?? line.value;
  const activeSide = selected?.side;

  // Track previous line value for animation
  const prevValRef = useRef<number>(lineValue);
  const [moved, setMoved] = useState<"up"|"down"|null>(null);

  useEffect(() => {
    const prev = prevValRef.current;
    if (lineValue !== prev) {
      setMoved(lineValue > prev ? "up" : "down");
      prevValRef.current = lineValue;
      const id = setTimeout(()=>setMoved(null), 900);
      return ()=>clearTimeout(id);
    }
  }, [lineValue]);

  function choose(side: "MORE"|"LESS") {
    if (locked) return;
    if (activeSide === side) {
      props.onToggle(null); // unselect
    } else {
      props.onToggle({ line_id: lineId, player: playerName, team: team, line_value: lineValue, side });
    }
  }

  return (
    <div
      className={classNames("row", { locked, focused })}
      style={moved ? (moved==="up" ? { background: "rgba(47,210,143,0.10)" } : { background: "rgba(255,107,107,0.10)" }) : undefined}
    >
      <div className="player">
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <div>{playerName}</div>
          {moved === "up" && <span title="Line moved up" style={{color:"var(--success)"}}>↑</span>}
          {moved === "down" && <span title="Line moved down" style={{color:"var(--danger)"}}>↓</span>}
        </div>
        <div className="small sub">
          {team ? `${team} • ` : ""} kills:
          <b> {lineValue.toFixed(1)}</b>
          {locked && <span style={{marginLeft:8, color:"var(--danger)"}}>(locked)</span>}
        </div>
      </div>
  <button className={classNames("more", {active: activeSide==="MORE"})} disabled={locked} onClick={()=>choose("MORE")}>More</button>
  <button className={classNames("less", {active: activeSide==="LESS"})} disabled={locked} onClick={()=>choose("LESS")}>Less</button>
    </div>
  );
}