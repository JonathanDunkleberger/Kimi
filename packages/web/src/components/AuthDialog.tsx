import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

export default function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const supabase = useSupabaseClient();
  const user = useUser();

  React.useEffect(() => {
    if (user && open) onOpenChange(false);
  }, [user, open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Login or Create Account</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={["google", "discord"]}
            redirectTo={typeof window !== "undefined" ? window.location.origin : undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
