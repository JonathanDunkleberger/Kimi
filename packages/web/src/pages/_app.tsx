import type { AppProps } from "next/app";
import "../styles/globals.css";
import "../styles/globals.tailwind.css";
import { useEffect } from "react";
import { getInitialTheme, setTheme } from "../lib/theme";
import { ClerkProvider } from '@clerk/nextjs';
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const content = (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );

  if (!publishableKey) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[Auth] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY missing: running without ClerkProvider');
    }
    return content;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {content}
    </ClerkProvider>
  );
}