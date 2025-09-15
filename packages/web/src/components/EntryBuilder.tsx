import React, { useMemo, useState } from "react";
import { createEntry } from "../lib/api";
import { Selection } from "./PlayerPropRow";

export default function EntryBuilder(props: {
  selections: Selection[];
  onRemove: (lineId: string) => void;
  onSubmitted: (credits: number) => void;
  toast: (msg: string) => void;
}) {
  const [stake, setStake] = useState<number>(10);
  const [rule, setRule] = useState<"2LEG_3X"|"3LEG_5X">("2LEG_3X");
  const token: string | undefined = undefined; // TODO: integrate Clerk session token

  const pickCount = props.selections.length;
  const canSubmit = !!token && pickCount >= 2 && pickCount <= 3 && (rule === "2LEG_3X" ? pickCount === 2 : pickCount === 3);

  const projectedPayout = useMemo(()=>{
    const mult = rule === "2LEG_3X" ? 3 : 5;
    return stake * mult;
  }, [stake, rule]);

  async function submit() {
    if (!token) { props.toast("Please sign in first."); return; }
    if (!canSubmit) { props.toast("Choose 2 or 3 legs to match the payout rule."); return; }
    try {
      const picks = props.selections.map(s => ({ playerProjectionId: s.line_id, pickType: s.side }));
      const out = await createEntry({ wager: stake, picks }, token);
      props.toast("Entry submitted!");
      // We don't currently get new credits in the Entry response; trigger balance refresh upstream if needed
      props.onSubmitted(stake); // pass stake for now (caller may refetch actual balance)
    } catch (e:any) {
      props.toast(`Failed: ${e.message}`);
    }
  }

  return (
    <div className="builder">
      <div className="builder-header">
  <div><b>Entry Builder</b> <span className="small">({props.selections.length} pick{props.selections.length!==1?"s":""})</span></div>
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