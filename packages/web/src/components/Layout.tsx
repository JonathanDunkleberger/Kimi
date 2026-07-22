import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth, SignInButton, UserButton } from "@/lib/authClient";
import BetSlip from "./BetSlip";
import { useMe } from "@/lib/api";
import { formatCredits, getMultiplier, MAX_PICKS, MIN_PICKS } from "@/lib/multipliers";
import { useBetSlip } from "@/store/betSlipStore";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { href: "/", label: "Board" },
  { href: "/entries", label: "Lineups" },
  { href: "/stats", label: "Stats" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const { selections, slipOpen, setSlipOpen, capNotice } = useBetSlip();
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isSignedIn) getToken().then(setToken);
    else setToken(null);
  }, [isSignedIn, getToken]);

  React.useEffect(() => {
    const open = () => setSlipOpen(true);
    window.addEventListener("open-slip", open);
    return () => window.removeEventListener("open-slip", open);
  }, [setSlipOpen]);

  // Toast when a 7th pick is blocked
  React.useEffect(() => {
    if (capNotice === 0) return;
    setToast(`Lineups max out at ${MAX_PICKS} picks`);
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [capNotice]);

  const { me, refresh } = useMe(token || undefined);

  React.useEffect(() => {
    const onPlaced = () => refresh();
    window.addEventListener("entry-placed", onPlaced);
    return () => window.removeEventListener("entry-placed", onPlaced);
  }, [refresh]);

  const isActive = (path: string) => router.pathname === path;
  const count = selections.length;
  const multiplier = getMultiplier(count);

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <Head>
        <title>Esports Props — Valorant &amp; Call of Duty Player Picks</title>
      </Head>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg-elev)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-5 px-3 md:px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2 no-underline">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] font-display text-[13px] font-black text-[var(--accent-ink)]">
              EP
            </span>
            <span className="font-display text-[15px] font-extrabold uppercase tracking-tight text-foreground">
              Esports<span className="text-[var(--accent)]">Props</span>
            </span>
          </Link>

          <nav className="hidden h-full items-stretch gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center border-b-2 px-3 text-[13px] font-bold no-underline transition-colors ${
                  isActive(item.href)
                    ? "border-[var(--accent)] text-foreground"
                    : "border-transparent text-[var(--text-muted)] hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {me && (
              <div className="flex items-center gap-1.5 rounded-lg bg-[var(--card)] px-2.5 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
                  Credits
                </span>
                <span className="num text-sm font-black leading-none text-[var(--accent)]">
                  {formatCredits(me.balance)}
                </span>
              </div>
            )}
            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/account"
                  className="hidden text-[13px] font-bold text-[var(--text-muted)] no-underline transition-colors hover:text-foreground sm:block"
                >
                  Account
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="h-9 whitespace-nowrap rounded-lg bg-foreground px-4 text-[13px] font-extrabold text-background transition-opacity hover:opacity-90"
                >
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-[var(--line)] px-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold no-underline transition-colors ${
                isActive(item.href)
                  ? "border-[var(--accent)] text-foreground"
                  : "border-transparent text-[var(--text-muted)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="relative mx-auto w-full max-w-[1440px] flex-1">
        <div className="flex items-start gap-4 p-3 pb-24 md:p-5 xl:pb-5">
          <div className="min-w-0 flex-1">{children}</div>
          <aside className="sticky top-[4.5rem] hidden w-[340px] shrink-0 xl:block">
            <BetSlip />
          </aside>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--bg-elev)]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-3 py-3 md:px-5">
          <p className="text-[11px] text-[var(--text-faint)]">
            Play-money Credits only — not real gambling.
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
            esportsprops.com
          </p>
        </div>
      </footer>

      {/* Sticky mobile lineup bar */}
      {count > 0 && !slipOpen && (
        <div className="animate-slide-up fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--bg-elev)]/97 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md xl:hidden">
          <button
            type="button"
            onClick={() => setSlipOpen(true)}
            className="flex h-13 w-full items-center justify-between rounded-xl bg-[var(--accent)] px-4 py-3 text-[var(--accent-ink)]"
          >
            <span className="flex items-center gap-2">
              <span className="num flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[13px] font-black text-[var(--accent)]">
                {count}
              </span>
              <span className="text-left">
                <span className="block font-display text-sm font-extrabold uppercase leading-none tracking-wide">
                  Finalize Lineup
                </span>
                <span className="mt-0.5 block text-[10px] font-bold opacity-70">
                  {count < MIN_PICKS
                    ? `Pick ${MIN_PICKS - count} more to unlock`
                    : `${count} picks · pays ${multiplier}x`}
                </span>
              </span>
            </span>
            <span className="font-display text-lg font-black">→</span>
          </button>
        </div>
      )}

      {/* Mobile lineup sheet */}
      <Sheet open={slipOpen} onOpenChange={setSlipOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-[var(--line)] bg-[var(--bg-elev)] p-0 xl:hidden"
        >
          <SheetTitle className="sr-only">Your Lineup</SheetTitle>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--line-strong)]" />
          <BetSlip embedded />
        </SheetContent>
      </Sheet>

      {/* Toast */}
      {toast && (
        <div className="animate-toast fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2.5 text-[13px] font-bold text-background shadow-xl xl:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}
