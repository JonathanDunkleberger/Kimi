import React, { useMemo, useState } from 'react';
import { useMatches, useAllPropLines } from '@/hooks/useMatches';
import MatchSection from '@/components/MatchSection';
import { Crosshair, Target as TargetIcon, CalendarOff } from 'lucide-react';
import type { Game } from '@/types';

const GAMES: { key: Game; label: string; icon: React.ReactNode }[] = [
  { key: 'valorant', label: 'VALORANT', icon: <Crosshair size={14} strokeWidth={2.5} /> },
  { key: 'cod', label: 'CALL OF DUTY', icon: <TargetIcon size={14} strokeWidth={2.5} /> },
];

export default function BoardPage() {
  const [activeGame, setActiveGame] = useState<Game>('cod');
  const { matches, loading: matchesLoading } = useMatches(activeGame);
  const matchIds = useMemo(() => matches.map((m) => m.id), [matches]);
  const { propLines, loading: propsLoading } = useAllPropLines(matchIds);

  const loading = matchesLoading || propsLoading;

  const liveCount = matches.filter((m) => m.status === 'live').length;

  return (
    <div className="anim-in">
      {/* Hero */}
      <div className="hero-banner">
        <div className="hero-badge">
          {liveCount > 0 ? (
            <>
              <div className="pulse" />
              {liveCount} Live
            </>
          ) : (
            <>
              <CalendarOff size={12} />
              Upcoming
            </>
          )}
        </div>
        <div className="hero-title">
          {activeGame === 'cod' ? 'Call of Duty League' : 'VCT Championship'}
        </div>
        <div className="hero-sub">
          Pick Over/Under on player stat lines. Build 2–6 leg entries. ML-powered projections.
        </div>
      </div>

      {/* Game Tabs */}
      <div className="game-tabs">
        {GAMES.map((g) => (
          <button
            key={g.key}
            className={`game-tab ${activeGame === g.key ? 'active' : ''}`}
            onClick={() => setActiveGame(g.key)}
          >
            {g.icon}
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="match-section">
          <div className="match-header" style={{ opacity: 0.5 }}>
            <div className="skeleton skeleton-bar w-24" style={{ height: 24 }} />
          </div>
          <div className="player-grid">
            {[...Array(6)].map((_, i) => (
              <div className="skeleton-card" key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="skeleton skeleton-circle" />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-bar w-24" style={{ marginBottom: 6 }} />
                    <div className="skeleton skeleton-bar w-16" />
                  </div>
                </div>
                <div className="skeleton skeleton-block" style={{ marginBottom: 8 }} />
                <div className="skeleton-actions">
                  <div className="skeleton skeleton-btn" />
                  <div className="skeleton skeleton-btn" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : matches.length === 0 ? (
        <div className="board-empty">
          <CalendarOff size={28} />
          <div className="board-empty-title">No matches available</div>
          <div className="board-empty-sub">
            Check back soon &mdash; {activeGame === 'cod' ? 'CDL' : 'VCT'} matches appear as they&apos;re scheduled.
          </div>
        </div>
      ) : (
        matches.map((match) => {
          const matchPropLines = propLines.filter(
            (pl) => pl.match_id === match.id
          );
          return (
            <MatchSection
              key={match.id}
              match={match}
              propLines={matchPropLines}
            />
          );
        })
      )}
    </div>
  );
}