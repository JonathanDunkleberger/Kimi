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
      <section className="rounded-2xl border border-filigree bg-hearth px-5 py-6">
        <p className="font-serif text-sm italic text-muted-foreground">
          Your purse &amp; sigil at the Inklings Club
        </p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-[0.08em] text-gold-bright">
          Account
        </h1>
        <div className="rune-rule mt-4" />
      </section>

      <div className="space-y-4 rounded-2xl border border-filigree bg-hearth p-6">
        {isLoading && <p className="font-serif italic text-muted-foreground">Loading…</p>}
        {me && (
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Club Member
              </p>
              <p className="font-display text-xl text-parchment">
                {me.username || me.email || me.id}
              </p>
              {me.isGuest && (
                <p className="mt-1 font-serif text-sm italic text-ember">
                  Guest mode — enter the club to keep Crowns across devices.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Crown Balance
              </p>
              <p className="font-display text-4xl text-gold-bright">
                {formatCrowns(me.balance)}
              </p>
            </div>
            <p className="font-serif text-sm text-muted-foreground">
              Play-money only — for friends and the portfolio grind, never real stakes.
              Starting grant: 100,000 Crowns. All legs must hit. Pushes count as losses.
              Map props unlock as the series unfolds.
            </p>
          </>
        )}

        {!isSignedIn && (
          <SignInButton mode="modal">
            <Button className="w-full bg-gold font-bold text-primary-foreground hover:bg-gold-bright">
              Enter the Club
            </Button>
          </SignInButton>
        )}
      </div>
    </div>
  );
}
