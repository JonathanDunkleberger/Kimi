import React from "react";
import Link from "next/link";
import { useSession, useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Button } from "@/components/ui/button";
import AuthDialog from "./AuthDialog";
import BetSlip from "./BetSlip";

export default function Layout({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [open, setOpen] = React.useState(false);
  const [slipOpen, setSlipOpen] = React.useState(false);

  React.useEffect(() => {
    function onOpen() { setSlipOpen(true); }
    window.addEventListener("open-slip", onOpen as EventListener);
    return () => window.removeEventListener("open-slip", onOpen as EventListener);
  }, []);

  async function handleAuthClick() {
    if (user) {
      await supabase.auth.signOut();
    } else {
      setOpen(true);
    }
  }

  const SlipContext = React.createContext<{ openSlip: () => void }>({ openSlip: () => {} });

  return (
    <SlipContext.Provider value={{ openSlip: () => setSlipOpen(true) }}>
      <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-semibold tracking-wide">
            VALPROPS
          </Link>
          <div className="flex items-center gap-2">
            <Button variant={user ? "secondary" : "default"} onClick={handleAuthClick}>
              {user ? "Logout" : "Login"}
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
      <AuthDialog open={open} onOpenChange={setOpen} />
  <BetSlip open={slipOpen} onOpenChange={setSlipOpen} />
      </div>
    </SlipContext.Provider>
  );
}
