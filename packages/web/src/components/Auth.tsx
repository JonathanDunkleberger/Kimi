import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AuthPanel({ open = true, onOpenChange }: { open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const supabase = useSupabaseClient();
  const user = useUser();

  React.useEffect(() => {
    if (user && open && onOpenChange) onOpenChange(false);
  }, [user, open, onOpenChange]);

  const content = (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={["google", "discord"]}
      redirectTo={typeof window !== "undefined" ? window.location.origin : undefined}
    />
  );

  // If onOpenChange provided, render in a Dialog; else render plain panel
  if (onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Login or Create Account</DialogTitle>
          </DialogHeader>
          <div className="py-2">{content}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return <div style={{ maxWidth: 420, margin: "40px auto" }}>{content}</div>;
}
