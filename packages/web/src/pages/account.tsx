import React from "react";
import { useAuth } from "@/lib/authClient";
import { useMe } from "@/lib/api";
import { formatCrowns } from "@/lib/multipliers";
import { SignInButton } from "@/lib/authClient";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  const { isSignedIn, getToken } = useAuth();
  const [token, setToken] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (isSignedIn) getToken().then((t) => setToken(t || undefined));
    else setToken(undefined);
  }, [isSignedIn, getToken]);

  const { me, isLoading } = useMe(token);

  return (
    <div className="animate-fade-rise mx-auto max-w-lg space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Profile &amp; balance
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground">
          Account
        </h1>
      </section>

      <div className="space-y-4 rounded-2xl border border-border bg-[var(--panel)] p-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {me && (
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                User
              </p>
              <p className="font-display text-xl font-bold text-foreground">
                {me.username || me.email || me.id}
              </p>
              {me.isGuest && (
                <p className="mt-1 text-sm text-[var(--coral)]">
                  Guest mode — sign in to keep Credits across devices.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Credit Balance
              </p>
              <p className="font-display text-4xl font-extrabold text-[var(--lime)]">
                {formatCrowns(me.balance)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Play-money only. Starting grant: 100,000 Credits. All legs must hit.
              Pushes count as losses. Map props unlock as the series unfolds.
            </p>
          </>
        )}

        {!isSignedIn && (
          <SignInButton mode="modal">
            <Button className="w-full bg-[var(--lime)] font-bold text-primary-foreground hover:bg-[var(--gold-bright)]">
              Sign in
            </Button>
          </SignInButton>
        )}
      </div>
    </div>
  );
}
