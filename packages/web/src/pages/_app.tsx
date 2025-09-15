import type { AppProps } from "next/app";
import "../styles/globals.css";
import "../styles/globals.tailwind.css";
import { useEffect } from "react";
import { getInitialTheme, setTheme } from "../lib/theme";
import { AuthProvider } from '@/lib/authClient';
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  const content = (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
  return <AuthProvider>{content}</AuthProvider>;
}