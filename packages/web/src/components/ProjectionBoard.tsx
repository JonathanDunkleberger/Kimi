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
        relative overflow-hidden transition-all duration-200 border bg-card shadow-sm hover:shadow-md flex flex-col
        ${selected ? 'ring-2 ring-primary border-transparent' : 'border-border/60'}
      `}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top Section: Image & Fire */}
        <div className="relative pt-6 pb-2 flex justify-center items-center bg-gradient-to-b from-secondary/20 to-transparent">
           {/* Fire Icon (Mock) */}
           <div className="absolute top-3 right-3 flex items-center gap-1 text-orange-500 font-bold text-xs">
             <span>🔥</span> <span>{Math.floor(p.value * 12)}</span>
           </div>

           {/* Player Image */}
           <div className="relative w-24 h-24">
              {!imgError && p.player.imageUrl ? (
                <img
                  src={p.player.imageUrl}
                  alt={p.player.name}
                  className="w-full h-full object-contain drop-shadow-xl"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-2xl font-black text-muted-foreground ring-4 ring-background">
                  {p.player.name.slice(0,2).toUpperCase()}
                </div>
              )}
           </div>
        </div>

        {/* Info Section */}
        <div className="text-center px-4 pb-2 space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
            {matchLabel}
          </div>
          <h3 className="font-black text-lg leading-none text-foreground truncate">
            {p.player.name}
          </h3>
          <div className="text-[10px] font-medium text-muted-foreground">
            {matchTime}
          </div>
        </div>

        {/* Stat Value */}
        <div className="text-center py-2">
          <div className="text-4xl font-black text-foreground tracking-tighter leading-none drop-shadow-sm">
            {p.value}
          </div>
          <div className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">
            {p.statType}
          </div>
        </div>

        {/* Actions (Bottom) */}
        <div className="mt-auto grid grid-cols-2 border-t border-border divide-x divide-border">
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
                ? 'bg-red-500/10 text-red-500' 
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
                ? 'bg-green-500/10 text-green-500' 
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

  const stats = Array.from(new Set(projections.map(p => p.statType))).sort();
  const filtered = activeStat === 'ALL' ? projections : projections.filter(p => p.statType === activeStat);

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(p => {
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
