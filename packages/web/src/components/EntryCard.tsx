'use client';

import React from 'react';
import type { Entry } from '@/types';
import { Clock } from 'lucide-react';

interface EntryCardProps {
  entry: Entry;
}

export default function EntryCard({ entry }: EntryCardProps) {
  const statusColors: Record<string, string> = {
    pending: '#FFB800',
    won: 'var(--accent-green)',
    lost: 'var(--accent)',
    void: 'var(--text-muted)',
  };

  const statusColor = statusColors[entry.status] || 'var(--text-muted)';

  return (
    <div className="ml-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase' as const,
              background: `${statusColor}20`,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}
          >
            {entry.status}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>
            {new Date(entry.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {entry.wager.toLocaleString()} K → {entry.potential_payout.toLocaleString()} K
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {entry.multiplier}x multiplier
          </div>
        </div>
      </div>

      {entry.entry_legs?.map((leg) => {
        const resultColor =
          leg.result === 'won'
            ? 'var(--accent-green)'
            : leg.result === 'lost'
            ? 'var(--accent)'
            : 'var(--text-muted)';

        const resultDisplay =
          leg.result === 'won'
            ? <span style={{ color: resultColor, fontWeight: 700, fontSize: 14 }}>✓</span>
            : leg.result === 'lost'
            ? <span style={{ color: resultColor, fontWeight: 700, fontSize: 14 }}>✕</span>
            : <Clock size={12} style={{ color: resultColor }} />;

        const playerName =
          (leg.prop_line?.player as any)?.ign ||
          (leg.prop_line?.player as any)?.name ||
          'Player';
        const propTypeName =
          (leg.prop_line?.prop_type as any)?.name || 'Total Kills';

        return (
          <div
            key={leg.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: '1px solid var(--border)',
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, marginRight: 8 }}>
                {playerName}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {propTypeName} — {leg.prop_line?.line_value}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                className={`slip-leg-pick ${leg.pick}`}
                style={{ fontSize: 12 }}
              >
                {leg.pick === 'over' ? '▲ OVER' : '▼ UNDER'}
              </span>
              {resultDisplay}
            </div>
          </div>
        );
      })}
    </div>
  );
}
