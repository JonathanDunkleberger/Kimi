import React from "react";
import Header from "../components/Header";
import { useEntries } from "../lib/api";

function pill(status: string) {
  const map: Record<string, string> = {
    OPEN: "rgba(255,255,255,0.12)",
    WON: "rgba(47,210,143,0.20)",
    LOST: "rgba(255,107,107,0.20)",
    CANCELLED: "rgba(255,209,102,0.20)",
  };
  return { background: map[status] || "rgba(255,255,255,0.12)" };
}

export default function Entries() {
  const { data, error, isLoading, refresh } = useEntries();

  return (
    <>
      <Header />
      <div className="container">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h2 style={{margin:"8px 0"}}>Your Entries</h2>
          <button className="btn" onClick={()=>refresh()}>Refresh</button>
        </div>

        {isLoading && <div className="card" style={{padding:16}}>Loading…</div>}
        {error && <div className="card" style={{padding:16, color:"var(--danger)"}}>Error loading entries.</div>}

        {data?.entries.length === 0 && <div className="card" style={{padding:16}}>No entries yet.</div>}

        <div style={{display:"grid", gap:12}}>
          {data?.entries.map(e => (
            <div key={e.entry_id} className="card" style={{padding:14}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
                <div>
                  <div style={{fontWeight:600}}>Entry • {new Date(e.created_at).toLocaleString()}</div>
                  <div className="small">Rule: {e.payout_rule} • Stake: {e.stake} credits</div>
                </div>
                <span className="badge" style={pill(e.status)}>{e.status}</span>
              </div>
              <div style={{display:"grid", gap:8}}>
                {e.legs.map((l, i) => (
                  <div key={l.line_id} className="card" style={{padding:"8px 10px", display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"center"}}>
                    <div>
                      <div style={{fontWeight:600}}>{l.player ?? "Player"}</div>
                      <div className="small">{l.team ?? ""} • kills {l.side} {l.line_value.toFixed(1)}</div>
                    </div>
                    <span className="badge">{l.result ? `Result: ${l.result}` : "Pending"}</span>
                    <span className="badge">{typeof l.player_final === "number" ? `Final: ${l.player_final}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}