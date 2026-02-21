'use client';

import React from 'react';
import type { PropLine } from '@/types';
import { useSlipStore } from '@/stores/slipStore';
import { TrendingUp, TrendingDown, Brain, ChevronUp, ChevronDown } from 'lucide-react';

interface PlayerCardProps {
  propLines: PropLine[];
}

export default function PlayerCard({ propLines }: PlayerCardProps) {
  const { picks, togglePick } = useSlipStore();

  if (propLines.length === 0) return null;

  const first = propLines[0];
  const player = first.player;
  const team = player?.team;
  const teamColor = team?.color || '#FF4655';
  const teamAbbrev = team?.abbrev || team?.name?.substring(0, 3).toUpperCase() || '???';
  const playerName = player?.ign || player?.name || 'Unknown';
  const role = player?.role || '';

  // Best ML confidence across all lines
  const bestMl = propLines.reduce<{ confidence: number | null; direction: string | null }>(
    (best, pl) => {
      if (pl.ml_confidence && (!best.confidence || pl.ml_confidence > best.confidence)) {
        return { confidence: pl.ml_confidence, direction: pl.ml_direction };
      }
      return best;
    },
    { confidence: null, direction: null }
  );

  return (
    <div className="player-card" style={{ '--team-color': teamColor } as React.CSSProperties}>
      {/* Header */}
      <div className="pc-header">
        <div className="pc-avatar" style={{ borderColor: `${teamColor}60` }}>
          {playerName.substring(0, 2).toUpperCase()}
        </div>
        <div className="pc-info">
          <div className="pc-name">{playerName}</div>
          <div className="pc-meta">
            <span className="pc-team" style={{ color: teamColor }}>{teamAbbrev}</span>
            {role && <span className="pc-role">{role}</span>}
          </div>
        </div>
        {bestMl.confidence && (
          <div className={`pc-ml ${bestMl.confidence >= 75 ? 'high' : bestMl.confidence >= 65 ? 'mid' : 'low'}`}>
            <Brain size={10} />
            <span>{bestMl.confidence}%</span>
          </div>
        )}
      </div>

      {/* Prop Lines */}
      <div className="pc-lines">
        {propLines.map((pl) => {
          const pick = picks.find((p) => p.propLine.id === pl.id);
          const propName = pl.prop_type?.name || 'Total Kills';
          return (
            <div key={pl.id} className="pc-line">
              <div className="pc-line-info">
                <span className="pc-prop-name">{propName}</span>
                <span className="pc-line-value">{pl.line_value}</span>
              </div>
              <div className="pc-line-actions">
                <button
                  className={`pc-ou-btn over ${pick?.direction === 'over' ? 'active' : ''}`}
                  onClick={() => togglePick(pl, 'over')}
                >
                  <ChevronUp size={14} strokeWidth={3} />
                  <span>Over</span>
                </button>
                <button
                  className={`pc-ou-btn under ${pick?.direction === 'under' ? 'active' : ''}`}
                  onClick={() => togglePick(pl, 'under')}
                >
                  <ChevronDown size={14} strokeWidth={3} />
                  <span>Under</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
