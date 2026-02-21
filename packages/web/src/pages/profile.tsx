import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useMyEntries } from '@/hooks/useMatches';
import { User, Lock, Clock, CheckCircle, XCircle } from 'lucide-react';
import dayjs from 'dayjs';

export default function Profile() {
  const { user } = useProfile();
  const { entries, loading } = useMyEntries(user?.id);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Lock className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
        <h1 className="text-2xl font-black">Sign in to view your profile</h1>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
          <User className="w-6 h-6 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black">{user.username}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {user.balance?.toLocaleString() ?? 0} K-Coins
          </p>
        </div>
      </div>

      <h2 className="text-lg font-bold">Recent Entries</h2>

      {loading && <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>}
      {!loading && entries.length === 0 && (
        <div className="text-sm text-[var(--text-muted)]">No entries yet.</div>
      )}

      <ul className="space-y-3">
        {entries.slice(0, 20).map((e) => {
          const icon =
            e.status === 'won' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
            e.status === 'lost' ? <XCircle className="w-4 h-4 text-red-400" /> :
            <Clock className="w-4 h-4 text-yellow-400" />;
          return (
            <li key={e.id} className="border border-white/10 rounded-xl p-4 bg-white/[0.03]">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="flex items-center gap-2 font-bold">
                  {icon}
                  {e.multiplier}x
                </span>
                <span className="text-[var(--text-muted)]">
                  {dayjs(e.created_at).format('MMM D, HH:mm')}
                </span>
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Stake: {e.wager} &bull; Payout: {e.potential_payout} &bull;{' '}
                <span className="capitalize">{e.status}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
