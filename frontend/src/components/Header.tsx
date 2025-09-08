import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { getAuthToken, setAuthBasic, clearAuth } from "../lib/auth";
import { signup } from "../lib/api";
import { getInitialTheme, setTheme, Theme } from "../lib/theme";

export default function Header(props: { onAccountChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const token = getAuthToken();

  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(()=>{ setThemeState(getInitialTheme()); }, []);
  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next); setThemeState(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup") {
      await signup(username, password);
    }
    setAuthBasic(username, password);
    setOpen(false);
    props.onAccountChange?.();
  }

  return (
    <>
      <div className="header container">
        <div className="brand">
          <h1>VALORANT • Props</h1>
                              <span>More/Less • Pro matches</span>
        </div>
        <div className="actions">
          <button className="btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <span className="badge">{dayjs().format("ddd, MMM D")}</span>
      {!token ? (
            <button className="btn" onClick={()=>setOpen(true)}>Sign in</button>
          ) : (
            <>
              <a className="btn" href="/account">Account</a>
        <button className="btn" onClick={()=>{ clearAuth(); props.onAccountChange?.(); }}>Sign out</button>
            </>
          )}
          <a className="btn primary" href="/admin">Admin</a>
        </div>
      </div>

      {open && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"grid", placeItems:"center", zIndex:40}}>
          <form onSubmit={handleSubmit} className="card" style={{width:360, padding:20}}>
            <h3 style={{marginTop:0}}>Welcome</h3>
            <div style={{display:"flex", gap:8, marginBottom:12}}>
              <button type="button" className="btn" onClick={()=>setMode("login")} style={{flex:1, background: mode==="login" ? "var(--card-strong)" : ""}}>Login</button>
              <button type="button" className="btn" onClick={()=>setMode("signup")} style={{flex:1, background: mode==="signup" ? "var(--card-strong)" : ""}}>Sign up</button>
            </div>
            <input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
            <div style={{height:10}}/>
            <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <div style={{height:16}}/>
            <button className="btn primary" style={{width:"100%", justifyContent:"center"}} type="submit">
              {mode==="login" ? "Login" : "Create account"}
            </button>
            <div className="small" style={{marginTop:10}}>Uses HTTP Basic to talk to your local API.</div>
          </form>
        </div>
      )}
    </>
  )
}