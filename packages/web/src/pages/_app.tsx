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
          colorPrimary: '#FF4655',
          colorBackground: '#12121A',
          colorInputBackground: '#1C1C28',
          colorInputText: '#EAEAF0',
          colorText: '#EAEAF0',
          colorTextSecondary: '#8888A0',
          borderRadius: '0.75rem',
          fontFamily: "'Outfit', sans-serif",
        },
        elements: {
          card: 'bg-[#12121A] border border-white/[0.06] shadow-2xl',
          headerTitle: 'text-[#EAEAF0] tracking-wider',
          headerSubtitle: 'text-[#8888A0]',
          formButtonPrimary:
            'bg-gradient-to-r from-[#FF4655] to-[#FF6B5A] hover:shadow-[0_6px_24px_rgba(255,70,85,0.35)] font-bold tracking-wider uppercase',
          formFieldInput:
            'bg-[#1C1C28] border-white/[0.06] text-[#EAEAF0] focus:border-[#FF4655]/40 focus:ring-[#FF4655]/20',
          formFieldLabel: 'text-[#8888A0] text-xs uppercase tracking-wider font-semibold',
          footerActionLink: 'text-[#FF4655] hover:text-[#FF6B5A]',
          identityPreview: 'bg-[#1C1C28] border-white/[0.06]',
          userButtonPopoverCard: 'bg-[#12121A] border border-white/[0.06]',
          userButtonPopoverActionButton: 'text-[#EAEAF0] hover:bg-white/[0.04]',
          userButtonPopoverActionButtonText: 'text-[#EAEAF0]',
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