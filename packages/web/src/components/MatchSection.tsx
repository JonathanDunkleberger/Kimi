'use client';

import React from 'react';
import type { Match, PropLine } from '@/types';
import PlayerCard from './PlayerCard';
import { Radio, Clock, MapPin, Swords, Shield, Crosshair, Lock } from 'lucide-react';

const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isMatchLocked(startTime: string): boolean {
  return new Date(startTime).getTime() - Date.now() < LOCK_WINDOW_MS;
}

interface MatchSectionProps {
  match: Match;
  propLines: PropLine[];
}

function GameModeIcon({ mode }: { mode: string | null }) {
  if (!mode) return null;
  const lower = mode.toLowerCase();
  if (lower.includes('hardpoint')) return <Crosshair size={12} />;
  if (lower.includes('search') || lower.includes('s&d')) return <Shield size={12} />;
  if (lower.includes('control')) return <Swords size={12} />;
  return null;
}

export default function MatchSection({ match, propLines }: MatchSectionProps) {
  const team1 = match.team_a;
  const team2 = match.team_b;
  const team1Color = team1?.color || '#FF4655';
  const team2Color = team2?.color || '#00C8FF';
  const team1Abbrev = team1?.abbrev || team1?.name?.substring(0, 3).toUpperCase() || '???';
  const team2Abbrev = team2?.abbrev || team2?.name?.substring(0, 3).toUpperCase() || '???';

  const eventName = match.event?.name || (match.game === 'cod' ? 'CDL 2026' : 'VCT 2026');
  const startTime = new Date(match.start_time);
  const isToday = new Date().toDateString() === startTime.toDateString();
  const timeStr = `${isToday ? 'Today' : startTime.toLocaleDateString('en-US', { weekday: 'short' })} ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  const isLive = match.status === 'live';
  const locked = isMatchLocked(match.start_time) || isLive;

  // Group prop lines by player
  const playerGroups = propLines.reduce<Record<string, PropLine[]>>((acc, pl) => {
    const pid = pl.player_id;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(pl);
    return acc;
  }, {});

  return (
    <div className="match-section">
      <div className="match-header">
        <div className="match-teams">
          <span
            className="team-tag"
            style={{ background: `${team1Color}18`, color: team1Color, borderColor: `${team1Color}30` }}
          >
            {team1Abbrev}
          </span>
          <span className="match-vs">VS</span>
          <span
            className="team-tag"
            style={{ background: `${team2Color}18`, color: team2Color, borderColor: `${team2Color}30` }}
          >
            {team2Abbrev}
          </span>
        </div>
        <div className="match-info">
          <div className="match-event">{eventName}</div>
          <div className="match-details">
            {isLive ? (
              <span className="match-live-badge">
                <Radio size={10} /> LIVE
              </span>
            ) : locked ? (
              <span className="match-locked-badge">
                <Lock size={10} /> Locked
              </span>
            ) : (
              <span className="match-time">
                <Clock size={10} /> {timeStr}
              </span>
            )}
            {match.game_mode && (
              <span className="match-mode">
                <GameModeIcon mode={match.game_mode} /> {match.game_mode}
              </span>
            )}
            {match.series_format && (
              <span className="match-format">{match.series_format}</span>
            )}
            {match.map && (
              <span className="match-map-tag">
                <MapPin size={10} /> {match.map}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="player-grid">
        {Object.entries(playerGroups).map(([playerId, pls]) => (
          <PlayerCard key={playerId} propLines={pls} locked={locked} />
        ))}
      </div>
    </div>
  );
}
