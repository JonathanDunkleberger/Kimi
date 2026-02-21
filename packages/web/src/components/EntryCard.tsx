'use client';

import React from 'react';
import type { Entry } from '@/types';
import { Clock, CheckCircle2, XCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface EntryCardProps {
  entry: Entry;
}

export default function EntryCard({ entry }: EntryCardProps) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: '#FFB800', label: 'PENDING' },
    won: { color: 'var(--over)', label: 'WON' },
    lost: { color: 'var(--under)', label: 'LOST' },
    void: { color: 'var(--text-muted)', label: 'VOID' },
  };

  const cfg = statusConfig[entry.status] || statusConfig.pending;

  return (
    <div
      className="entry-card"
      style={{ borderLeft: `3px solid ${cfg.color}` }}
    >
      <div className="entry-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className={`entry-status ${entry.status.toUpperCase()}`}
          >
            {cfg.label}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
            {new Date(entry.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="entry-amounts">
          <div>
            <div className="label">Wager</div>
            <div className="value">{entry.wager.toLocaleString()} K</div>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>→</div>
          <div>
            <div className="label">Payout</div>
            <div className="value" style={{ color: 'var(--text-primary)' }}>
              {entry.potential_payout.toLocaleString()} K
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
            {entry.multiplier}x
          </div>
        </div>
      </div>

      <div className="entry-legs">
        {entry.entry_legs?.map((leg) => {
          const playerName =
            (leg.prop_line?.player as any)?.ign ||
            (leg.prop_line?.player as any)?.name ||
            'Player';
          const propTypeName =
            (leg.prop_line?.prop_type as any)?.name || 'Total Kills';

          return (
            <div className="entry-leg" key={leg.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="entry-leg-player">{playerName}</div>
                <div className="entry-leg-detail">
                  {propTypeName} — {leg.prop_line?.line_value}
                </div>
              </div>
              <span className={`entry-leg-pick ${leg.pick}`}>
                {leg.pick === 'over' ? (
                  <><ChevronUp size={10} strokeWidth={3} /> OVER</>
                ) : (
                  <><ChevronDown size={10} strokeWidth={3} /> UNDER</>
                )}
              </span>
              <span className="entry-leg-result">
                {leg.result === 'won' ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                ) : leg.result === 'lost' ? (
                  <XCircle size={16} style={{ color: 'var(--accent)' }} />
                ) : (
                  <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
