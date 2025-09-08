import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";

export default function AuthPanel() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();

  React.useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={["google", "discord"]}
        redirectTo={typeof window !== "undefined" ? window.location.origin : undefined}
      />
    </div>
  );
}
