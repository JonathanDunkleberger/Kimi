import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getInitialTheme, setTheme, Theme } from '../lib/theme';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function Header(_props: { onAccountChange?: () => void }) {

  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(()=>{ setThemeState(getInitialTheme()); }, []);
  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next); setThemeState(next);
  }

  // Auth handled by Clerk; local basic auth removed.

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
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn">Sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <a className="btn" href="/account">Account</a>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <a className="btn primary" href="/admin">Admin</a>
        </div>
      </div>

      {/* Clerk modal is handled by <SignInButton>; legacy modal removed */}
    </>
  )
}