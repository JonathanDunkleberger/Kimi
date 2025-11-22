import React from 'react';
import dayjs from 'dayjs';
import ThemeToggle from './ThemeToggle';
import { UserButton, SignedIn, SignedOut, SignInButton, useAuth } from '@/lib/authClient';
import { useMe } from '@/lib/api';

export default function Header(_props: { onAccountChange?: () => void }) {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isSignedIn) {
      getToken().then(setToken);
    } else {
      setToken(null);
    }
  }, [isSignedIn, getToken]);

  const { me } = useMe(token || undefined);

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
            {me && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span>
                <span className="font-mono font-bold text-accent text-lg leading-none">{me.balance.toLocaleString()}</span>
              </div>
            )}
            <a className="btn" href="/account">Account</a>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <a className="btn primary" href="/admin">Admin</a>
        </div>
      </div>
    </>
  )
}