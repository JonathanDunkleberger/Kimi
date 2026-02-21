'use client';

import React, { useState } from 'react';
import type { PropLine } from '@/types';
import { useSlipStore } from '@/stores/slipStore';
import { ChevronUp, ChevronDown, Lock } from 'lucide-react';

interface PlayerCardProps {
  propLines: PropLine[];
  locked?: boolean;
}

const PRIMARY_STAT_KEYS = ['kills_m1m2', 'kills_m1m2m3'];

export default function PlayerCard({ propLines, locked = false }: PlayerCardProps) {
  const { picks, togglePick } = useSlipStore();
  const [expanded, setExpanded] = useState(false);

  if (propLines.length === 0) return null;

  const first = propLines[0];
  const player = first.player;
  const team = player?.team;
  const teamColor = team?.color || '#FF4655';
  const teamAbbrev = team?.abbrev || team?.name?.substring(0, 3).toUpperCase() || '???';
  const playerName = player?.ign || player?.name || 'Unknown';
  const role = player?.role || '';

  // Split into primary & secondary
  const primary = propLines.find((pl) =>
    PRIMARY_STAT_KEYS.includes(pl.prop_type?.stat_key || '')
  ) || propLines[0];
  const secondary = propLines.filter((pl) => pl.id !== primary.id);

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

  const primaryPick = picks.find((p) => p.propLine.id === primary.id);
  const primaryName = primary.prop_type?.name || 'Kills';
  const hasPickInSlip = propLines.some((pl) => picks.some((p) => p.propLine.id === pl.id));

  return (
    <div className={`player-card${hasPickInSlip ? ' selected' : ''}`} style={{ '--team-color': teamColor } as React.CSSProperties}>
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
          <div className={`pc-ml ${bestMl.confidence >= 80 ? 'high' : bestMl.confidence >= 65 ? 'mid' : 'low'}`}>
            <span className="conf-dot" />
            <span>{bestMl.confidence}%</span>
          </div>
        )}
      </div>

      {/* Primary Prop */}
      <div className="pc-primary">
        <div className="pc-primary-label">{primaryName}</div>
        <div className="pc-primary-value">{primary.line_value}</div>
        {locked ? (
          <div className="pc-locked"><Lock size={12} /> Locked</div>
        ) : (
          <div className="pc-primary-actions">
            <button
              className={`pc-ou-btn over ${primaryPick?.direction === 'over' ? 'active' : ''}`}
              onClick={() => togglePick(primary, 'over')}
            >
              <span>▲ Over</span>
            </button>
            <button
              className={`pc-ou-btn under ${primaryPick?.direction === 'under' ? 'active' : ''}`}
              onClick={() => togglePick(primary, 'under')}
            >
              <span>▼ Under</span>
            </button>
          </div>
        )}
      </div>

      {/* Secondary Props Toggle */}
      {secondary.length > 0 && (
        <>
          <button className="pc-expand-btn" onClick={() => setExpanded(!expanded)}>
            <span>{expanded ? 'Hide props' : `More props (${secondary.length})`}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="pc-secondary">
              {secondary.map((pl) => {
                const pick = picks.find((p) => p.propLine.id === pl.id);
                const propName = pl.prop_type?.name || 'Prop';
                return (
                  <div key={pl.id} className="pc-line">
                    <div className="pc-line-info">
                      <span className="pc-prop-name">{propName}</span>
                      <span className="pc-line-value">{pl.line_value}</span>
                    </div>
                    <div className="pc-line-actions">
                      {locked ? (
                        <span className="pc-locked-sm"><Lock size={10} /></span>
                      ) : (
                        <>
                          <button
                            className={`pc-ou-btn compact over ${pick?.direction === 'over' ? 'active' : ''}`}
                            onClick={() => togglePick(pl, 'over')}
                          >
                            <span>▲ O</span>
                          </button>
                          <button
                            className={`pc-ou-btn compact under ${pick?.direction === 'under' ? 'active' : ''}`}
                            onClick={() => togglePick(pl, 'under')}
                          >
                            <span>▼ U</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
