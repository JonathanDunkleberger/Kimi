import React, { useMemo, useState } from 'react';
import { useMatches, useAllPropLines } from '@/hooks/useMatches';
import MatchSection from '@/components/MatchSection';
import { Crosshair, Swords, Loader2, CalendarOff } from 'lucide-react';
import type { Game } from '@/types';

const GAMES: { key: Game; label: string; icon: React.ReactNode }[] = [
  { key: 'valorant', label: 'Valorant', icon: <Crosshair size={16} strokeWidth={2.5} /> },
  { key: 'cod', label: 'Call of Duty', icon: <Swords size={16} strokeWidth={2.5} /> },
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
          Pick Over/Under on player stat lines. Build 2 &ndash; 6 leg entries.
          ML-powered projections.
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
        <div className="board-empty">
          <Loader2 size={28} className="spin" />
          <span>Loading matches&hellip;</span>
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