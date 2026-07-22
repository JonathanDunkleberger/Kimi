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
import { ScrollText, Swords, Trophy, BookOpen } from "lucide-react";

const NAV = [
  { href: "/", label: "The Lists", icon: Swords },
  { href: "/entries", label: "Quests", icon: ScrollText },
  { href: "/stats", label: "Chronicle", icon: BookOpen },
  { href: "/leaderboard", label: "Hall", icon: Trophy },
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
        <title>Esports Props — Inklings Club</title>
      </Head>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="hearth-glow absolute -left-24 top-0 h-[420px] w-[420px] rounded-full" />
        <div className="hearth-glow-gold absolute -right-16 top-24 h-[360px] w-[360px] rounded-full" />
        <div className="inklings-mist absolute inset-x-0 bottom-0 h-48" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-ink/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="group flex flex-col no-underline">
              <span className="font-display text-xl font-black tracking-[0.08em] text-gold-bright transition group-hover:text-gold md:text-2xl">
                ESPORTS PROPS
              </span>
              <span className="font-serif text-[11px] italic tracking-wide text-muted-foreground">
                inklings club · val &amp; cod
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
                      className={`gap-2 font-semibold ${active ? "border border-gold/30 text-gold-bright" : "text-muted-foreground"}`}
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
              <div className="flex flex-col items-end rounded-lg border border-gold/20 bg-moss/40 px-3 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Crowns
                </span>
                <span className="font-display text-lg leading-none text-gold-bright">
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
                <Button className="font-bold bg-gold text-primary-foreground hover:bg-gold-bright">
                  Enter the Club
                </Button>
              </SignInButton>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-border/40 px-2 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="no-underline">
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                size="sm"
                className="whitespace-nowrap text-xs"
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
          <div className="sticky top-[5.75rem] hidden w-[380px] shrink-0 xl:block">
            <BetSlip />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-border/50 bg-ink/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left md:px-6">
          <p className="font-serif text-sm italic text-muted-foreground">
            Crowns are play-money — for friends, not fortune. Statistically, real gambling is a terrible decision.
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold/70">
            Esports Props · Inklings Club
          </p>
        </div>
      </footer>

      <button
        type="button"
        onClick={() => setSlipOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full border border-gold/40 bg-gold px-5 font-display text-sm font-bold text-primary-foreground shadow-lg xl:hidden"
      >
        Slip
        {selections.length > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-gold-bright">
            {selections.length}
          </span>
        )}
      </button>

      <Sheet open={slipOpen} onOpenChange={setSlipOpen}>
        <SheetContent side="right" className="w-full border-l border-gold/20 bg-ink p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="font-display text-gold-bright">Your Parchment</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <BetSlip embedded />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
