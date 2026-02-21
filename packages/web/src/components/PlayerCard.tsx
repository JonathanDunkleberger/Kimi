'use client';

import React, { useState } from 'react';
import type { PropLine } from '@/types';
import { useSlipStore } from '@/stores/slipStore';
import { ChevronUp, ChevronDown, Lock, ArrowUp, ArrowDown } from 'lucide-react';

interface PlayerCardProps {
  propLines: PropLine[];
  locked?: boolean;
}

const PRIMARY_STAT_KEYS = ['kills_m1m2', 'kills_m1m2m3'];

const TEAM_PRIMARY_COLORS: Record<string, string> = {
  // CDL 2026
  'TOR': '#2b60de',
  'MIN': '#7c3aed',
  'OPT': '#16a34a',
  'ATL': '#dc2626',
  'LAT': '#9333ea',
  'NYS': '#ea580c',
  'MIA': '#f59e0b',
  'SEA': '#0891b2',
  'LV':  '#dc2626',
  'CAR': '#2563eb',
  'BOS': '#16a34a',
  'PAR': '#e11d48',
  // VCT
  'SEN': '#dc2626',
  'C9':  '#2563eb',
  '100T': '#dc2626',
  'NRG': '#f97316',
  'LOUD': '#16a34a',
};

export default function PlayerCard({ propLines, locked = false }: PlayerCardProps) {
  const { picks, togglePick } = useSlipStore();
  const [expanded, setExpanded] = useState(false);

  if (propLines.length === 0) return null;

  const first = propLines[0];
  const player = first.player;
  const team = player?.team;
  const teamAbbrev = team?.abbrev || team?.name?.substring(0, 3).toUpperCase() || '???';
  const teamColor = TEAM_PRIMARY_COLORS[teamAbbrev] || team?.color || '#00e5a0';
  const playerName = player?.ign || player?.name || 'Unknown';
  const role = player?.role || '';
  const initials = playerName.substring(0, 2).toUpperCase();

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
    <div
      className={`player-card${hasPickInSlip ? ' selected' : ''}`}
      style={{
        '--team-color': teamColor,
        borderColor: hasPickInSlip ? `${teamColor}88` : `${teamColor}22`,
        boxShadow: hasPickInSlip ? `0 0 20px ${teamColor}15` : undefined,
      } as React.CSSProperties}
    >
      {/* Solid team color strip */}
      <div className="pc-strip" style={{ backgroundColor: teamColor }} />

      {/* Header */}
      <div className="pc-header">
        <div className="pc-avatar" style={{ backgroundColor: teamColor }}>
          {initials}
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
              <ArrowUp size={13} /> OVR
            </button>
            <button
              className={`pc-ou-btn under ${primaryPick?.direction === 'under' ? 'active' : ''}`}
              onClick={() => togglePick(primary, 'under')}
            >
              <ArrowDown size={13} /> UND
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
                const conf = pl.ml_confidence;
                return (
                  <div key={pl.id} className="pc-exp-row">
                    <div className="pc-exp-label">
                      <span className="pc-exp-name">{propName}</span>
                      {conf && (
                        <span className="pc-exp-conf">{conf}% confidence</span>
                      )}
                    </div>
                    <span className="pc-exp-value">{pl.line_value}</span>
                    {locked ? (
                      <span className="pc-locked-sm"><Lock size={10} /></span>
                    ) : (
                      <div className="pc-exp-actions">
                        <button
                          className={`pc-exp-btn over ${pick?.direction === 'over' ? 'active' : ''}`}
                          onClick={() => togglePick(pl, 'over')}
                        >
                          <ArrowUp size={12} /> OVR
                        </button>
                        <button
                          className={`pc-exp-btn under ${pick?.direction === 'under' ? 'active' : ''}`}
                          onClick={() => togglePick(pl, 'under')}
                        >
                          <ArrowDown size={12} /> UND
                        </button>
                      </div>
                    )}
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
