import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth, SignInButton, UserButton } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import BetSlip from "./BetSlip";
import ThemeToggle from "./ThemeToggle";
import { useMe } from "@/lib/api";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [slipOpen, setSlipOpen] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isSignedIn) {
      getToken().then(setToken);
    } else {
      setToken(null);
    }
  }, [isSignedIn, getToken]);

  const { me } = useMe(token || undefined);

  React.useEffect(() => {
    function onOpen() { setSlipOpen(true); }
    window.addEventListener("open-slip", onOpen as EventListener);
    return () => window.removeEventListener("open-slip", onOpen as EventListener);
  }, []);

  const SlipContext = React.createContext<{ openSlip: () => void }>({ openSlip: () => {} });

  const isActive = (path: string) => router.pathname === path;

  return (
    <SlipContext.Provider value={{ openSlip: () => setSlipOpen(true) }}>
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group no-underline mr-4">
              <span className="font-black tracking-tighter text-2xl text-foreground group-hover:text-foreground/80 transition-colors">
                Kira
              </span>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/">
                <Button 
                  variant="ghost" 
                  className={`font-bold text-sm h-9 ${isActive('/') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Board
                </Button>
              </Link>
              <Link href="/entries">
                <Button 
                  variant="ghost" 
                  className={`font-bold text-sm h-9 ${isActive('/entries') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  My Lineups
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle className="hidden sm:flex" />
            
            {isSignedIn ? (
              <div className="flex items-center gap-4">
                {me && (
                  <div className="flex flex-col items-end mr-4">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Balance</span>
                    <span className="font-mono font-bold text-green-500 text-lg leading-none">${me.balance.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Link href="/account">
                    <Button variant="ghost" size="sm">Account</Button>
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            ) : (
              <SignInButton mode="modal">
                <Button variant="default" className="font-bold shadow-lg shadow-primary/20">Login</Button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
      <BetSlip open={slipOpen} onOpenChange={setSlipOpen} />
      </div>
    </SlipContext.Provider>
  );
}
