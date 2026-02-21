'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useProfile } from '@/hooks/useProfile';
import { Crosshair, Layers, Target, Trophy, Brain, LogIn } from 'lucide-react';

export function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="coin-icon"
    >
      <circle cx="12" cy="12" r="11" fill="#f5c542" />
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#080a0f"
        fontFamily="'Manrope', sans-serif"
        fontWeight="800"
        fontSize="13"
      >
        K
      </text>
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
    { key: '/', label: 'BOARD', icon: Layers },
    { key: '/entries', label: 'LINEUPS', icon: Target },
    { key: '/leaderboard', label: 'RANKS', icon: Trophy },
    { key: '/ml', label: 'ENGINE', icon: Brain },
  ];

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo" style={{ textDecoration: 'none' }}>
        <div className="nav-logo-icon">
          <Crosshair size={18} color="#080a0f" strokeWidth={2.5} />
        </div>
        KIMI
      </Link>

      <div className="nav-tabs">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.key} href={t.key} style={{ textDecoration: 'none' }}>
              <button
                className={`nav-tab ${router.pathname === t.key ? 'active' : ''}`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            </Link>
          );
        })}
      </div>

      <div className="nav-balance">
        <SignedIn>
          <div className="balance-chip">
            <CoinIcon size={16} />
            {(user?.balance ?? 0).toLocaleString()}
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9 rounded-full border-2 border-[#00e5a0]/30',
              },
            }}
          />
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="nav-login">
              <LogIn size={14} />
              Log in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="nav-signin">
              Sign up
            </button>
          </SignUpButton>
        </SignedOut>
      </div>
    </nav>
  );
}
