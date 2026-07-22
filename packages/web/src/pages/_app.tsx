import type { AppProps } from "next/app";
import "../styles/globals.tailwind.css";
import { AuthProvider } from "@/lib/authClient";
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
