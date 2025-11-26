import React, { useState } from 'react';
import { useProjections } from '../lib/api';
import { useBetSlip } from '../store/betSlipStore';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

const ProjectionCard = ({ p, selected, isMore, isLess, toggle }: any) => {
  const [imgError, setImgError] = useState(false);

  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-200 border bg-card shadow-sm hover:shadow-md
        ${selected ? 'ring-2 ring-primary border-transparent' : 'border-border/60'}
      `}
    >
      <CardContent className="p-0">
        {/* Header & Stat Row */}
        <div className="p-4 flex items-center justify-between gap-3">
          {/* Player Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 ring-1 ring-border/50 shrink-0">
              {!imgError && p.player.imageUrl ? (
                <img
                  src={p.player.imageUrl}
                  alt={p.player.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {p.player.name.slice(0,2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-bold text-sm truncate text-foreground leading-tight">{p.player.name}</h4>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{p.player.team || 'FA'}</span>
            </div>
          </div>

          {/* Stat Value */}
          <div className="flex flex-col items-end shrink-0">
            <span className="text-2xl font-black text-foreground tracking-tighter leading-none">{p.value}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{p.statType}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
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
              relative flex items-center justify-center py-2.5 rounded-lg transition-all duration-200 font-bold text-xs uppercase tracking-wide
              ${isMore 
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-[1.02]' 
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }
            `}
          >
            More
          </button>
          
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
              relative flex items-center justify-center py-2.5 rounded-lg transition-all duration-200 font-bold text-xs uppercase tracking-wide
              ${isLess 
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-[1.02]' 
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }
            `}
          >
            Less
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
