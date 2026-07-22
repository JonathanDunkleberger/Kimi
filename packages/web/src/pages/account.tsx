import React from "react";
import { useAuth, SignInButton } from "@/lib/authClient";
import { useMe } from "@/lib/api";
import { formatCredits } from "@/lib/multipliers";

export default function AccountPage() {
  const { isSignedIn, getToken } = useAuth();
  const [token, setToken] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (isSignedIn) getToken().then((t) => setToken(t || undefined));
    else setToken(undefined);
  }, [isSignedIn, getToken]);

  const { me, isLoading } = useMe(token);

  return (
    <div className="animate-fade mx-auto max-w-lg space-y-3">
      <h1 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
        Account
      </h1>

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]">
        {isLoading && (
          <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Loading…</p>
        )}
        {me && (
          <>
            <div className="border-b border-[var(--line)] px-4 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                User
              </p>
              <p className="font-display text-base font-extrabold text-foreground">
                {me.username || me.email || me.id}
              </p>
              {me.isGuest && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Guest mode — sign in to keep Credits across devices.
                </p>
              )}
            </div>
            <div className="border-b border-[var(--line)] px-4 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                Credit Balance
              </p>
              <p className="num text-3xl font-black text-[var(--accent)]">
                {formatCredits(me.balance)}
              </p>
            </div>
            <p className="px-4 py-3.5 text-xs leading-relaxed text-[var(--text-muted)]">
              Play-money only. Starting grant: 100,000 Credits. All legs must
              hit. Pushes count as losses. Map props unlock as the series
              unfolds.
            </p>
          </>
        )}

        {!isSignedIn && (
          <div className="px-4 pb-4">
            <SignInButton mode="modal">
              <button
                type="button"
                className="h-11 w-full rounded-lg bg-[var(--accent)] font-display text-sm font-extrabold uppercase tracking-wide text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                Sign in
              </button>
            </SignInButton>
          </div>
        )}
      </div>
    </div>
  );
}
