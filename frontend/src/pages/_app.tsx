import type { AppProps } from "next/app";
import "../styles/globals.css";
import { useEffect } from "react";
import { getInitialTheme, setTheme } from "../lib/theme";
import { SessionContextProvider, type Session } from "@supabase/auth-helpers-react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";

export default function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  useEffect(() => {
    // set immediately to avoid FOUC
    setTheme(getInitialTheme());
  }, []);
  return (
  <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}