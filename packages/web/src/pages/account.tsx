import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useClerk } from '@clerk/nextjs';
import { User, Wallet, History, LogOut, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { CoinIcon } from '@/components/Nav';
import Link from 'next/link';

export default function Account() {
  const { user, loading } = useProfile();
  const { signOut } = useClerk();

  if (loading) {
    return (
      <div className="account-container anim-in" style={{ paddingTop: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton skeleton-bar" style={{ width: 200, height: 28 }} />
          <div className="account-grid">
            <div className="skeleton-card" style={{ height: 100 }} />
            <div className="skeleton-card" style={{ height: 100 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="entries-empty anim-in">
        <div style={{ marginBottom: 12 }}><User size={36} /></div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Not signed in</div>
        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
          Sign in to view your account details.
        </div>
      </div>
    );
  }

  return (
    <div className="account-container anim-in">
      <div className="account-header">
        <h1 className="account-title">Account</h1>
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="account-signout"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      <div className="account-grid">
        <div className="account-card">
          <div className="account-card-label">
            <User size={14} /> Username
          </div>
          <div className="account-card-value" style={{ color: 'var(--text)' }}>
            {user.username || '—'}
          </div>
        </div>
        <div className="account-card">
          <div className="account-card-label">
            <Wallet size={14} /> Balance
          </div>
          <div className="account-card-value" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CoinIcon size={18} />
            {(user.balance ?? 0).toLocaleString()}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>K-Coins</span>
          </div>
        </div>
      </div>

      <div className="account-stats-row">
        <div className="account-stat">
          <div className="account-stat-icon"><TrendingUp size={18} style={{ color: 'var(--accent)' }} /></div>
          <div className="account-stat-value" style={{ color: 'var(--accent)' }}>{user.wins ?? 0}</div>
          <div className="account-stat-label">Wins</div>
        </div>
        <div className="account-stat">
          <div className="account-stat-icon"><TrendingDown size={18} style={{ color: 'var(--red)' }} /></div>
          <div className="account-stat-value" style={{ color: 'var(--red)' }}>{user.losses ?? 0}</div>
          <div className="account-stat-label">Losses</div>
        </div>
        <div className="account-stat">
          <div className="account-stat-icon"><Flame size={18} style={{ color: 'var(--gold)' }} /></div>
          <div className="account-stat-value" style={{ color: 'var(--gold)' }}>{user.current_streak ?? 0}</div>
          <div className="account-stat-label">Streak</div>
        </div>
      </div>

      <div className="account-history-card">
        <div className="account-history-title">
          <History size={18} /> History
        </div>
        <div className="account-history-sub">
          View your past entries and results.
        </div>
        <Link href="/entries" className="account-history-btn">
          View Entry History
        </Link>
      </div>
    </div>
  );
}