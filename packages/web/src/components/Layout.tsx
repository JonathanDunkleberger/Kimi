import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth, SignInButton, UserButton } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import BetSlip from "./BetSlip";
import ThemeToggle from "./ThemeToggle";
import { useMe } from "@/lib/api";
import { formatCrowns } from "@/lib/multipliers";
import { useBetSlip } from "@/store/betSlipStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LayoutGrid, ListChecks, BarChart3, Trophy } from "lucide-react";

const NAV = [
  { href: "/", label: "Board", icon: LayoutGrid },
  { href: "/entries", label: "Lineups", icon: ListChecks },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const { selections, slipOpen, setSlipOpen } = useBetSlip();

  React.useEffect(() => {
    if (isSignedIn) getToken().then(setToken);
    else setToken(null);
  }, [isSignedIn, getToken]);

  React.useEffect(() => {
    const open = () => setSlipOpen(true);
    window.addEventListener("open-slip", open);
    return () => window.removeEventListener("open-slip", open);
  }, [setSlipOpen]);

  const { me, refresh } = useMe(token || undefined);

  React.useEffect(() => {
    const onPlaced = () => refresh();
    window.addEventListener("entry-placed", onPlaced);
    return () => window.removeEventListener("entry-placed", onPlaced);
  }, [refresh]);

  const isActive = (path: string) => router.pathname === path;

  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <Head>
        <title>Esports Props</title>
      </Head>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-[#07090d]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-6 md:gap-8">
            <Link href="/" className="group flex items-center gap-2.5 no-underline">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lime)] font-display text-sm font-extrabold text-primary-foreground">
                EP
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight text-foreground md:text-xl">
                Esports Props
              </span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} className="no-underline">
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-2 font-semibold ${
                        active
                          ? "bg-[var(--panel-2)] text-[var(--lime)]"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggle className="hidden sm:flex" />
            {me && (
              <div className="flex flex-col items-end rounded-xl border border-border bg-[var(--panel)] px-3 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Credits
                </span>
                <span className="font-display text-lg leading-none text-[var(--lime)]">
                  {formatCrowns(me.balance)}
                </span>
              </div>
            )}
            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <Link href="/account" className="no-underline">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Account
                  </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <SignInButton mode="modal">
                <Button className="font-bold bg-[var(--lime)] text-primary-foreground hover:bg-[var(--gold-bright)]">
                  Sign in
                </Button>
              </SignInButton>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-border/50 px-2 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="no-underline">
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                size="sm"
                className={`whitespace-nowrap text-xs ${
                  isActive(item.href) ? "text-[var(--lime)]" : ""
                }`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1600px] flex-1">
        <div className="flex items-start gap-6 p-4 md:p-6">
          <div className="min-w-0 flex-1">{children}</div>
          <div className="sticky top-[5rem] hidden w-[360px] shrink-0 xl:block">
            <BetSlip />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-border/60 bg-[#07090d]/80">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left md:px-6">
          <p className="text-sm text-muted-foreground">
            Credits are play-money for friends — not real gambling.
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            esportsprops.com
          </p>
        </div>
      </footer>

      <button
        type="button"
        onClick={() => setSlipOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-[var(--lime)] px-5 font-display text-sm font-extrabold text-primary-foreground shadow-lg xl:hidden"
      >
        Lineup
        {selections.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#10140a] px-1.5 text-xs text-[var(--lime)]">
            {selections.length}
          </span>
        )}
      </button>

      <Sheet open={slipOpen} onOpenChange={setSlipOpen}>
        <SheetContent side="right" className="w-full border-l border-border bg-[var(--ink)] p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="font-display text-foreground">Your Lineup</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <BetSlip embedded />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
