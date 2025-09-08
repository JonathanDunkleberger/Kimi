import React, { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import { useBoard } from "../lib/api";
import Header from "../components/Header";
import MatchCard from "../components/MatchCard";
import EntryBuilder from "../components/EntryBuilder";
import useToast from "../components/Toast";
import { Selection } from "../components/PlayerPropRow";

type FlatLine = { line_id: string; player: string; team?: string | null; match_id: string; line_value: number; };

export default function Home() {
  const [date, setDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const { board, isLoading, error, refresh } = useBoard(date, { refreshInterval: 15000, revalidateOnFocus: true });
  const { toast, node } = useToast();

  const [selections, setSelections] = useState<Record<string, Selection | undefined>>({});
  const [cursor, setCursor] = useState<number>(0); // highlighted row index in flattened list

  const flat: FlatLine[] = useMemo(()=>{
    const list: FlatLine[] = [];
    board?.matches.forEach(m => {
      m.lines.forEach(l => list.push({ line_id: l.line_id, player: l.player, team: l.team, match_id: m.match_id, line_value: l.line_value }));
    });
    return list;
  }, [board]);

  useEffect(()=>{ if (cursor >= flat.length) setCursor(Math.max(flat.length - 1, 0)); }, [flat.length, cursor]);

  function setSelection(lineId: string, sel: Selection | null) {
    setSelections(prev => {
      const copy = { ...prev };
      if (sel) {
        const count = Object.values(copy).filter(Boolean).length;
        if (!copy[lineId] && count >= 3) { toast("Max 3 legs in MVP."); return prev; }
        copy[lineId] = sel;
      } else {
        delete copy[lineId];
      }
      return copy;
    });
  }

  const selectionList = useMemo(()=>Object.values(selections).filter(Boolean) as Selection[], [selections]);

  // --- Keyboard controls: ↑/↓, O, U, Backspace ---
  const onKey = useCallback((e: KeyboardEvent)=>{
    if (!flat.length) return;
    if (["ArrowDown","ArrowUp","o","u","O","U","Backspace"].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowDown") setCursor(c => Math.min(c+1, flat.length-1));
    if (e.key === "ArrowUp") setCursor(c => Math.max(c-1, 0));
    const cur = flat[Math.max(Math.min(cursor, flat.length-1), 0)];
    if (!cur) return;
    if (e.key.toLowerCase() === "m") setSelection(cur.line_id, { line_id: cur.line_id, player: cur.player, team: cur.team, line_value: cur.line_value, side: "MORE" });
    if (e.key.toLowerCase() === "l") setSelection(cur.line_id, { line_id: cur.line_id, player: cur.player, team: cur.team, line_value: cur.line_value, side: "LESS" });
    if (e.key === "Backspace") setSelection(cur.line_id, null);
  }, [flat, cursor]);

  useEffect(()=>{
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <>
      <Header onAccountChange={refresh}/>
      <div className="container">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
          <h2 style={{margin:"8px 0"}}>Today’s Board</h2>
          <div style={{display:"flex", gap:10}}>
            <input className="input" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            <button className="btn" onClick={()=>refresh()}>Refresh</button>
          </div>
        </div>

        {isLoading && <div className="card" style={{padding:16}}>Loading…</div>}
        {error && <div className="card" style={{padding:16, color:"var(--danger)"}}>Failed to load board.</div>}

        {board?.matches.map(m => (
          <MatchCard
            key={m.match_id}
            match={m}
            selections={selections}
            onChange={setSelection}
            // Pass focused line id to children: the one whose index matches `cursor`
            focusedLineId={flat[cursor]?.line_id}
          />
        ))}
      </div>

      <EntryBuilder
        selections={selectionList}
        onRemove={(id)=>setSelection(id, null)}
        onSubmitted={()=>{ setSelections({}); refresh(); }}
        toast={toast}
      />
      {node}
    </>
  );
}