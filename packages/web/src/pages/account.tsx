import React from "react";
import Header from "../components/Header";
import { useMe } from "../lib/api";

export default function Account() {
  // TODO: integrate real auth token acquisition (e.g., Clerk) and pass token to useMe(token)
  const token: string | undefined = undefined;
  const { me, error, isLoading, refresh } = useMe(token);

  return (
    <>
  <Header onAccountChange={refresh}/>
      <div className="container">
        <div className="card" style={{padding:20}}>
          <h2 style={{marginTop:0}}>Account</h2>
          {!me && !error && <div>Loading…</div>}
          {error && <div style={{color:"var(--danger)"}}>Not signed in or API error.</div>}
          {me && (
            <>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
                <div className="card" style={{padding:14}}>
                  <div className="small">Email</div>
                  <div style={{fontWeight:600}}>{me.email || '—'}</div>
                </div>
                <div className="card" style={{padding:14}}>
                  <div className="small">Balance</div>
                  <div style={{fontWeight:700, fontSize:18}}>{me.balance}</div>
                </div>
              </div>
              <div style={{marginTop:16}}>
                <a className="btn" href="/entries">View entries history</a>
              </div>
            </>
          )}
          <div className="small" style={{marginTop:12}}>MVP shows credits and links to your entry history.</div>
        </div>
      </div>
    </>
  )
}