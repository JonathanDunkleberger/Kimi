import React, { useState } from 'react';
import { useProjections } from '../lib/api';
import { useBetSlip } from '../store/betSlipStore';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

const ProjectionCard = ({ p, selected, isMore, isLess, toggle }: any) => {
  const [imgError, setImgError] = useState(false);
  
  // Format date: "Fri 1:00am"
  const date = new Date(p.match?.scheduledAt || Date.now());
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const matchTime = `${dateStr} ${timeStr}`;

  // Team vs Opponent
  const team = p.player.team || 'FA';
  const opponent = p.match ? (p.match.teamA === team ? p.match.teamB : p.match.teamA) : 'TBD';
  const matchLabel = p.match ? `${team} vs ${opponent}` : team;

  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-200 border bg-card shadow-sm hover:shadow-md flex flex-col h-[320px]
        ${selected ? 'ring-2 ring-primary border-transparent' : 'border-border/60'}
      `}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top Section: Image */}
        <div className="relative h-[120px] flex justify-center items-end bg-gradient-to-b from-secondary/20 to-transparent pt-4">
           {/* Player Image */}
           <div className="relative w-full h-full flex items-end justify-center overflow-hidden">
              {!imgError && p.player.imageUrl ? (
                <img
                  src={p.player.imageUrl}
                  alt={p.player.name}
                  className="h-[100%] w-auto object-contain drop-shadow-xl translate-y-1"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-20 h-20 mb-2 rounded-full bg-secondary flex items-center justify-center text-2xl font-black text-muted-foreground ring-4 ring-background">
                  {p.player.name.slice(0,2).toUpperCase()}
                </div>
              )}
           </div>
        </div>

        {/* Info Section */}
        <div className="text-center px-4 py-2 space-y-1 flex-1 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
            {matchLabel}
          </div>
          <h3 className="font-black text-lg leading-none text-foreground truncate w-full">
            {p.player.name}
          </h3>
          <div className="text-[10px] font-medium text-muted-foreground">
            {matchTime}
          </div>
          
          {/* Stat Value */}
          <div className="mt-2">
            <div className="text-4xl font-black text-foreground tracking-tighter leading-none drop-shadow-sm">
              {p.value}
            </div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
              {p.statType}
            </div>
          </div>
        </div>

        {/* Actions (Bottom) */}
        <div className="mt-auto grid grid-cols-2 border-t border-border divide-x divide-border h-[48px]">
          <button
            onClick={() => toggle({ 
              projectionId: p.id, 
              pickType: 'LESS',
              player: p.player.name,
              team: p.player.team,
              statType: p.statType,
              value: p.value
            })}
            className={`
              flex items-center justify-center py-3 transition-colors group
              ${isLess 
                ? 'bg-green-500 text-white' 
                : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <span className="text-xs font-black uppercase tracking-wider group-hover:scale-105 transition-transform">↓ Less</span>
          </button>
          
          <button
            onClick={() => toggle({ 
              projectionId: p.id, 
              pickType: 'MORE',
              player: p.player.name,
              team: p.player.team,
              statType: p.statType,
              value: p.value
            })}
            className={`
              flex items-center justify-center py-3 transition-colors group
              ${isMore 
                ? 'bg-green-500 text-white' 
                : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <span className="text-xs font-black uppercase tracking-wider group-hover:scale-105 transition-transform">↑ More</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProjectionBoard: React.FC = () => {
  const { projections, isLoading, error, refresh } = useProjections();
  const { selections, toggle } = useBetSlip();
  const [activeStat, setActiveStat] = React.useState<string>('ALL');

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground animate-pulse">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p>Loading projections...</p>
    </div>
  );
  
  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-destructive">
      <p>Failed to load projections.</p>
      <Button variant="outline" onClick={() => refresh()}>Try Again</Button>
    </div>
  );

  if (!projections.length) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-foreground">No projections available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          There are no active projections at the moment. This could mean no matches are scheduled soon, or the data is being updated.
        </p>
      </div>
      <Button onClick={() => refresh()}>Check for Updates</Button>
    </div>
  );

  // Filter Logic:
  // 1. Filter by Stat Type
  // 2. Filter by "Next Day of Matches"
  // 3. Deduplicate (One card per player)
  
  let filtered = activeStat === 'ALL' ? projections : projections.filter(p => p.statType === activeStat);
  
  // Sort by time
  filtered.sort((a, b) => {
    const tA = new Date(a.match?.scheduledAt || 0).getTime();
    const tB = new Date(b.match?.scheduledAt || 0).getTime();
    return tA - tB;
  });

  // Find the date of the earliest match in the filtered set
  let targetDateStr = "";
  if (filtered.length > 0) {
      const firstDate = new Date(filtered[0].match?.scheduledAt || Date.now());
      targetDateStr = firstDate.toDateString();
  }

  // Filter to only include matches on that day
  if (targetDateStr) {
    filtered = filtered.filter(p => {
        const d = new Date(p.match?.scheduledAt || Date.now());
        return d.toDateString() === targetDateStr;
    });
  }

  // Deduplicate by player ID (keep first occurrence which is earliest game)
  const seenPlayers = new Set();
  const uniqueProjections = [];
  for (const p of filtered) {
    if (!seenPlayers.has(p.player.id)) {
      seenPlayers.add(p.player.id);
      uniqueProjections.push(p);
    }
  }

  const displayProjections = uniqueProjections;

  const stats = Array.from(new Set(projections.map(p => p.statType))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 p-2 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full sm:w-auto px-2">
          <Button
            variant={activeStat === 'ALL' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveStat('ALL')}
            className={`rounded-lg font-bold ${activeStat === 'ALL' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
          >
            ALL
          </Button>
          {stats.map(s => (
            <Button
              key={s}
              variant={activeStat === s ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveStat(s)}
              className={`rounded-lg font-bold whitespace-nowrap ${activeStat === s ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
            >
              {s}
            </Button>
          ))}
        </div>
        <button onClick={() => refresh()} className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors px-4">
          Refresh Board
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        {displayProjections.map(p => {
          const sel = selections.find(s => s.projectionId === p.id);
          const isMore = sel?.pickType === 'MORE';
          const isLess = sel?.pickType === 'LESS';
          const selected = !!sel;
          
          return (
            <ProjectionCard 
              key={p.id} 
              p={p} 
              selected={selected} 
              isMore={isMore} 
              isLess={isLess} 
              toggle={toggle} 
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProjectionBoard;
