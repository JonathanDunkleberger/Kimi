import React from 'react';
import dayjs from 'dayjs';
import ThemeToggle from './ThemeToggle';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@/lib/authClient';

export default function Header(_props: { onAccountChange?: () => void }) {

  // Theme handled by ThemeToggle component

  // Auth handled by Clerk; local basic auth removed.

  return (
    <>
      <div className="header container">
        <div className="brand">
          <h1>VALORANT • Props</h1>
                              <span>More/Less • Pro matches</span>
        </div>
        <div className="actions">
          <ThemeToggle />
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