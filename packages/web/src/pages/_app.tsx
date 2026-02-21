import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/globals.tailwind.css';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>Kimi — Esports Props</title>
      </Head>
      <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#00e5a0',
          colorBackground: '#0f1118',
          colorInputBackground: '#161924',
          colorInputText: '#eceef4',
          colorText: '#eceef4',
          colorTextSecondary: '#6b7094',
          borderRadius: '0.75rem',
          fontFamily: "'Manrope', sans-serif",
        },
        elements: {
          card: 'bg-[#0f1118] border border-[#1e2236] shadow-2xl',
          headerTitle: 'text-[#eceef4] tracking-wider',
          headerSubtitle: 'text-[#6b7094]',
          formButtonPrimary:
            'bg-[#00e5a0] hover:bg-[#00cc8e] text-[#080a0f] font-bold tracking-wider uppercase',
          formFieldInput:
            'bg-[#161924] border-[#1e2236] text-[#eceef4] focus:border-[#00e5a0]/40 focus:ring-[#00e5a0]/20',
          formFieldLabel: 'text-[#6b7094] text-xs uppercase tracking-wider font-semibold',
          footerActionLink: 'text-[#00e5a0] hover:text-[#00cc8e]',
          identityPreview: 'bg-[#161924] border-[#1e2236]',
          userButtonPopoverCard: 'bg-[#0f1118] border border-[#1e2236]',
          userButtonPopoverActionButton: 'text-[#eceef4] hover:bg-white/[0.04]',
          userButtonPopoverActionButtonText: 'text-[#eceef4]',
          userButtonPopoverFooter: 'hidden',
        },
      }}
      {...pageProps}
    >
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ClerkProvider>
    </>
  );
}