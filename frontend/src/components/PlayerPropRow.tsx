import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { BoardLine } from "../lib/api";

export type Selection = {
  line_id: string;
  player: string;
  team?: string | null;
  line_value: number;
  side: "MORE" | "LESS";
};

export default function PlayerPropRow(props: {
  line: BoardLine;
  selected?: Selection | null;
  onToggle: (sel: Selection | null) => void;
  locked?: boolean;
  focused?: boolean;
}) {
  const { line, selected, locked, focused } = props;
  const activeSide = selected?.side;

  // Track previous line value for animation
  const prevValRef = useRef<number>(line.line_value);
  const [moved, setMoved] = useState<"up"|"down"|null>(null);

  useEffect(() => {
    const prev = prevValRef.current;
    if (line.line_value !== prev) {
      setMoved(line.line_value > prev ? "up" : "down");
      prevValRef.current = line.line_value;
      const id = setTimeout(()=>setMoved(null), 900);
      return ()=>clearTimeout(id);
    }
  }, [line.line_value]);

  function choose(side: "MORE"|"LESS") {
    if (locked) return;
    if (activeSide === side) {
      props.onToggle(null); // unselect
    } else {
      props.onToggle({ line_id: line.line_id, player: line.player, team: line.team, line_value: line.line_value, side });
    }
  }

  return (
    <div
      className={classNames("row", { locked, focused })}
      style={moved ? (moved==="up" ? { background: "rgba(47,210,143,0.10)" } : { background: "rgba(255,107,107,0.10)" }) : undefined}
    >
      <div className="player">
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <div>{line.player}</div>
          {moved === "up" && <span title="Line moved up" style={{color:"var(--success)"}}>↑</span>}
          {moved === "down" && <span title="Line moved down" style={{color:"var(--danger)"}}>↓</span>}
        </div>
        <div className="small sub">
          {line.team ? `${line.team} • ` : ""} kills:
          <b> {line.line_value.toFixed(1)}</b>
          {locked && <span style={{marginLeft:8, color:"var(--danger)"}}>(locked)</span>}
        </div>
      </div>
      <button className={classNames("more", {active: activeSide==="MORE"})} disabled={locked} onClick={()=>choose("MORE")}>More</button>
      <button className={classNames("less", {active: activeSide==="LESS"})} disabled={locked} onClick={()=>choose("LESS")}>Less</button>
    </div>
  );
}