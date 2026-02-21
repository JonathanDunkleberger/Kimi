import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useClerk } from '@clerk/nextjs';
import { User, Wallet, History, LogOut, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import Link from 'next/link';

export default function Account() {
  const { user, loading } = useProfile();
  const { signOut } = useClerk();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-28 bg-white/5 rounded-xl" />
            <div className="h-28 bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <User className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
        <h1 className="text-2xl font-black">Not signed in</h1>
        <p className="text-[var(--text-muted)]">Sign in to view your account details.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Account</h1>
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03] shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
            <User className="w-4 h-4" />
            Username
          </div>
          <div className="font-bold text-lg">{user.username || '—'}</div>
        </div>
        <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03] shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] mb-2">
            <Wallet className="w-4 h-4" />
            Balance
          </div>
          <div className="font-mono font-bold text-2xl text-[var(--accent)]">
            {user.balance?.toLocaleString() ?? '0'} <span className="text-sm text-[var(--text-muted)]">K-Coins</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-3">
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <div className="font-black text-xl">{user.wins ?? 0}</div>
          <div className="text-xs text-[var(--text-muted)]">Wins</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] text-center">
          <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <div className="font-black text-xl">{user.losses ?? 0}</div>
          <div className="text-xs text-[var(--text-muted)]">Losses</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] text-center">
          <Flame className="w-5 h-5 mx-auto mb-1 text-orange-400" />
          <div className="font-black text-xl">{user.current_streak ?? 0}</div>
          <div className="text-xs text-[var(--text-muted)]">Streak</div>
        </div>
      </div>

      <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03] shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--text-muted)]" />
          <h3 className="font-bold text-lg">History</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)]">View your past entries and results.</p>
        <Link
          href="/entries"
          className="inline-flex items-center justify-center rounded-lg text-sm font-bold bg-[var(--accent)] text-black hover:opacity-90 transition-opacity h-10 px-6 w-full sm:w-auto"
        >
          View Entry History
        </Link>
      </div>
    </div>
  );
}