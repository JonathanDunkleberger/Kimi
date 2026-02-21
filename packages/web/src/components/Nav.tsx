'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useProfile } from '@/hooks/useProfile';

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M9 9h6M9 15h6" strokeLinecap="round" />
    </svg>
  );
}

interface NavProps {
  onSlipToggle?: () => void;
}

export default function Nav({ onSlipToggle }: NavProps) {
  const router = useRouter();
  const { user } = useProfile();

  const tabs = [
    { key: '/', label: 'Board' },
    { key: '/entries', label: 'My Lineups' },
    { key: '/leaderboard', label: 'Leaderboard' },
    { key: '/ml', label: 'ML Engine' },
  ];

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo" style={{ textDecoration: 'none' }}>
        KIMI<span>Esports Props</span>
      </Link>

      <div className="nav-tabs">
        {tabs.map((t) => (
          <Link key={t.key} href={t.key} style={{ textDecoration: 'none' }}>
            <button
              className={`nav-tab ${router.pathname === t.key ? 'active' : ''}`}
            >
              {t.label}
            </button>
          </Link>
        ))}
      </div>

      <div className="nav-balance">
        <SignedIn>
          <div className="balance-chip">
            <CoinIcon />
            {(user?.balance ?? 0).toLocaleString()} K
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9 rounded-full border-2 border-[#FF4655]/30',
              },
            }}
          />
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="nav-signin">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </nav>
  );
}
