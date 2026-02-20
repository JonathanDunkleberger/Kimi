import type { AppProps } from 'next/app';
import '../styles/globals.css';
import '../styles/globals.tailwind.css';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}