'use client';

import React from 'react';
import type { Entry } from '@/types';
import { Clock, CheckCircle2, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { CoinIcon } from '@/components/Nav';

interface EntryCardProps {
  entry: Entry;
}

export default function EntryCard({ entry }: EntryCardProps) {
  return (
    <div className="entry-card">
      <div className="entry-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className={`entry-status ${entry.status.toUpperCase()}`}
          >
            {entry.status.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
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
            <div className="value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CoinIcon size={13} /> {entry.wager.toLocaleString()}
            </div>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>→</div>
          <div>
            <div className="label">Payout</div>
            <div className="value" style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CoinIcon size={13} /> {entry.potential_payout.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 700, alignSelf: 'flex-end' }}>
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
                  <><ArrowUp size={10} strokeWidth={3} /> OVR</>
                ) : (
                  <><ArrowDown size={10} strokeWidth={3} /> UND</>
                )}
              </span>
              <span className="entry-leg-result">
                {leg.result === 'won' ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                ) : leg.result === 'lost' ? (
                  <XCircle size={16} style={{ color: 'var(--red)' }} />
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
