import React, { useState } from 'react';
import { useMyEntries } from '@/hooks/useMatches';
import { useProfile } from '@/hooks/useProfile';
import EntryCard from '@/components/EntryCard';
import { Lock, ClipboardList } from 'lucide-react';
import { CoinIcon } from '@/components/Nav';

type EntryFilter = 'all' | 'active' | 'won' | 'lost';

export default function EntriesPage() {
  const { user } = useProfile();
  const { entries, loading } = useMyEntries(user?.id);
  const [filter, setFilter] = useState<EntryFilter>('all');

  const activeEntries = entries.filter((e) => e.status === 'pending');
  const wonEntries = entries.filter((e) => e.status === 'won');
  const lostEntries = entries.filter((e) => e.status === 'lost');
  const settledEntries = entries.filter((e) => e.status !== 'pending');

  const display = filter === 'all'
    ? entries
    : filter === 'active'
    ? activeEntries
    : filter === 'won'
    ? wonEntries
    : lostEntries;

  // P/L calc
  const totalWagered = settledEntries.reduce((s, e) => s + e.wager, 0);
  const totalWon = settledEntries.reduce(
    (s, e) => (e.status === 'won' ? s + e.potential_payout : s),
    0
  );
  const net = totalWon - totalWagered;

  if (!user) {
    return (
      <div className="entries-empty anim-in">
        <div style={{ marginBottom: 12 }}><Lock size={36} /></div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Sign in to view your lineups</div>
        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
          Your entries will appear here after you place them.
        </div>
      </div>
    );
  }

  const filters: { key: EntryFilter; label: string }[] = [
    { key: 'all', label: `All (${entries.length})` },
    { key: 'active', label: `Active (${activeEntries.length})` },
    { key: 'won', label: `Won (${wonEntries.length})` },
    { key: 'lost', label: `Lost (${lostEntries.length})` },
  ];

  return (
    <div className="anim-in">
      {/* Header */}
      <div className="entries-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font)' }}>
            My Lineups
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Track your active and past entries.
          </div>
        </div>
        {settledEntries.length > 0 && (
          <div className="entries-pl-chip">
            <span className="entries-pl-label">Net P/L</span>
            <span
              className="entries-pl-value"
              style={{ color: net >= 0 ? 'var(--accent)' : 'var(--red)' }}
            >
              <CoinIcon size={14} />
              {net >= 0 ? '+' : ''}
              {net.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="entries-tabs">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`entries-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading entries...
        </div>
      ) : display.length === 0 ? (
        <div className="entries-empty">
          <div style={{ marginBottom: 12 }}>
            <ClipboardList size={28} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            No {filter === 'all' ? '' : filter} entries {filter === 'all' ? 'yet' : ''}
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
            {filter === 'active' || filter === 'all'
              ? 'Head to the Board and build your first lineup!'
              : `Your ${filter} entries will appear here.`}
          </div>
        </div>
      ) : (
        <div className="entries-list">
          {display.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}