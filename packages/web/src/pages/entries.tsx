import React, { useState } from 'react';
import { useMyEntries } from '@/hooks/useMatches';
import { useProfile } from '@/hooks/useProfile';
import EntryCard from '@/components/EntryCard';
import { Lock, ClipboardList, BarChart3 } from 'lucide-react';

export default function EntriesPage() {
  const { user } = useProfile();
  const { entries, loading } = useMyEntries();
  const [tab, setTab] = useState<'live' | 'settled'>('live');

  const liveEntries = entries.filter(
    (e) => e.status === 'pending'
  );
  const settledEntries = entries.filter(
    (e) => e.status !== 'pending'
  );

  const display = tab === 'live' ? liveEntries : settledEntries;

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

  return (
    <div className="anim-in">
      {/* Header */}
      <div className="entries-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
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
              style={{ color: net >= 0 ? 'var(--over)' : 'var(--under)' }}
            >
              {net >= 0 ? '+' : ''}
              {net.toLocaleString()} K
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="entries-tabs">
        <button
          className={`entries-tab ${tab === 'live' ? 'active' : ''}`}
          onClick={() => setTab('live')}
        >
          Live ({liveEntries.length})
        </button>
        <button
          className={`entries-tab ${tab === 'settled' ? 'active' : ''}`}
          onClick={() => setTab('settled')}
        >
          Settled ({settledEntries.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading entries...
        </div>
      ) : display.length === 0 ? (
        <div className="entries-empty">
          <div style={{ marginBottom: 12 }}>
            {tab === 'live' ? <ClipboardList size={28} /> : <BarChart3 size={28} />}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            No {tab} entries yet
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
            {tab === 'live'
              ? 'Head to the Board and build your first lineup!'
              : 'Your settled entries will appear here.'}
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