import type { AppProps } from "next/app";
import "../styles/globals.css";
import "../styles/globals.tailwind.css";
import { useEffect } from "react";
import { getInitialTheme, setTheme } from "../lib/theme";
import { ClerkProvider } from '@clerk/nextjs';
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // set immediately to avoid FOUC
    setTheme(getInitialTheme());
  }, []);
  return (
    <ClerkProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ClerkProvider>
  );
}