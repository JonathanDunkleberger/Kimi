import React, { useMemo, useState } from "react";
import { LegIn, createEntry } from "../lib/api";
import { getAuthToken } from "../lib/auth";
import { Selection } from "./PlayerPropRow";

export default function EntryBuilder(props: {
  selections: Selection[];
  onRemove: (lineId: string) => void;
  onSubmitted: (credits: number) => void;
  toast: (msg: string) => void;
}) {
  const [stake, setStake] = useState<number>(10);
  const [rule, setRule] = useState<"2LEG_3X"|"3LEG_5X">("2LEG_3X");
  const token = getAuthToken();

  const legs: LegIn[] = props.selections.map(s => ({ line_id: s.line_id, side: s.side }));
  const canSubmit = !!token && legs.length >= 2 && legs.length <= 3 && (rule === "2LEG_3X" ? legs.length === 2 : legs.length === 3);

  const projectedPayout = useMemo(()=>{
    const mult = rule === "2LEG_3X" ? 3 : 5;
    return stake * mult;
  }, [stake, rule]);

  async function submit() {
  if (!token) { props.toast("Please sign in first."); return; }
    if (!canSubmit) { props.toast("Choose 2 or 3 legs to match the payout rule."); return; }
    try {
      const out = await createEntry({ stake, payout_rule: rule, legs });
      props.toast("Entry submitted!");
      props.onSubmitted(out.new_credits);
    } catch (e:any) {
      props.toast(`Failed: ${e.message}`);
    }
  }

  return (
    <div className="builder">
      <div className="builder-header">
        <div><b>Entry Builder</b> <span className="small">({props.selections.length} leg{props.selections.length!==1?"s":""})</span></div>
        <div className="small">Stake → Payout</div>
      </div>
      <div className="builder-body">
        {props.selections.length === 0 && <div className="small">Select More/Less to add legs.</div>}
        {props.selections.map(s => (
          <div key={s.line_id} className="card" style={{padding:"10px 12px", display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center"}}>
            <div>
              <div style={{fontWeight:600}}>{s.player}</div>
              <div className="small">{s.team ?? ""} • kills {s.side} {s.line_value.toFixed(1)}</div>
            </div>
            <span className="badge">{s.side}</span>
            <button className="btn" onClick={()=>props.onRemove(s.line_id)}>Remove</button>
          </div>
        ))}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          <select className="select" value={rule} onChange={e=>setRule(e.target.value as any)}>
            <option value="2LEG_3X">2-Leg • 3x</option>
            <option value="3LEG_5X">3-Leg • 5x</option>
          </select>
          <input className="input" type="number" min={1} max={100} value={stake} onChange={(e)=>setStake(parseInt(e.target.value || "0"))} placeholder="Stake (credits)"/>
        </div>
      </div>
      <div className="builder-footer">
        <div className="small">Projected payout: <b>{projectedPayout}</b> credits</div>
        <button className="btn primary" onClick={submit} disabled={!canSubmit}>Submit</button>
      </div>
    </div>
  )
}