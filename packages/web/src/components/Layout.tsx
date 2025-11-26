import React from "react";
import Link from "next/link";
import { useAuth, SignInButton, SignOutButton } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import BetSlip from "./BetSlip";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [slipOpen, setSlipOpen] = React.useState(false);

  React.useEffect(() => {
    function onOpen() { setSlipOpen(true); }
    window.addEventListener("open-slip", onOpen as EventListener);
    return () => window.removeEventListener("open-slip", onOpen as EventListener);
  }, []);

  const SlipContext = React.createContext<{ openSlip: () => void }>({ openSlip: () => {} });

  return (
    <SlipContext.Provider value={{ openSlip: () => setSlipOpen(true) }}>
      <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-black tracking-tighter text-xl">
            Kimi
          </Link>
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <SignOutButton>
                <Button variant="secondary">Logout</Button>
              </SignOutButton>
            ) : (
              <SignInButton mode="modal">
                <Button variant="default">Login</Button>
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
