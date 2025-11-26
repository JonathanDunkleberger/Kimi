import React from 'react';
import { useProjections } from '../lib/api';
import { useBetSlip } from '../store/betSlipStore';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(p => {
          const sel = selections.find(s => s.projectionId === p.id);
          const isMore = sel?.pickType === 'MORE';
          const isLess = sel?.pickType === 'LESS';
          const selected = !!sel;
          
          return (
            <Card 
              key={p.id}
              className={`
                relative overflow-hidden transition-all duration-200 border border-border bg-card shadow-sm
                ${selected ? 'ring-2 ring-primary' : 'hover:border-primary/50'}
              `}
            >
              <CardContent className="p-0">
                {/* Player Header */}
                <div className="p-4 flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-secondary ring-2 ring-border shrink-0">
                    {p.player.imageUrl ? (
                      <img
                        src={p.player.imageUrl}
                        alt={p.player.name}
                        className="w-full h-full object-cover"
                        onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                        {p.player.name.slice(0,2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg truncate text-foreground">{p.player.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium uppercase">{p.player.team || 'FA'}</span>
                      <span>•</span>
                      <span>VALORANT</span>
                    </div>
                  </div>
                </div>

                {/* Stat Value */}
                <div className="px-4 pb-4 flex flex-col items-center justify-center">
                  <div className="text-3xl font-black text-foreground tracking-tight">{p.value}</div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wider mt-1">{p.statType}</div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 border-t border-border divide-x divide-border">
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
                      flex flex-col items-center justify-center py-3 transition-colors
                      ${isMore 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">More</span>
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
                      flex flex-col items-center justify-center py-3 transition-colors
                      ${isLess 
                        ? 'bg-red-500/10 text-red-500' 
                        : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">Less</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectionBoard;
