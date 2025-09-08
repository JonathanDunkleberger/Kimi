import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { getMe } from "../lib/api";

export default function Account() {
  const [me, setMe] = useState<{username:string;credits:number} | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try { const m = await getMe(); setMe({username:m.username, credits:m.credits}); setErr(null); }
    catch (e:any) { setErr(e.message); setMe(null); }
  }
  useEffect(()=>{ load(); }, []);

  return (
    <>
      <Header onAccountChange={load}/>
      <div className="container">
        <div className="card" style={{padding:20}}>
          <h2 style={{marginTop:0}}>Account</h2>
          {!me && !err && <div>Loading…</div>}
          {err && <div style={{color:"var(--danger)"}}>Not signed in or API error.</div>}
          {me && (
            <>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
                <div className="card" style={{padding:14}}>
                  <div className="small">Username</div>
                  <div style={{fontWeight:600}}>{me.username}</div>
                </div>
                <div className="card" style={{padding:14}}>
                  <div className="small">Credits</div>
                  <div style={{fontWeight:700, fontSize:18}}>{me.credits}</div>
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