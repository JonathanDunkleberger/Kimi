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
                relative overflow-hidden transition-all duration-200 border-0 ring-1 ring-border bg-card shadow-lg
                ${selected ? 'ring-2 ring-primary shadow-primary/10' : 'hover:ring-primary/50 hover:shadow-xl hover:-translate-y-1'}
              `}
            >
              {/* Team Background Gradient */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-secondary/50 to-transparent pointer-events-none" />

              <CardContent className="p-0">
                {/* Player Header */}
                <div className="relative p-5 flex items-start justify-between z-10">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-background ring-2 ring-border shrink-0 shadow-sm">
                      {p.player.imageUrl ? (
                        <img
                          src={p.player.imageUrl}
                          alt={p.player.name}
                          className="w-full h-full object-cover"
                          onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-black text-muted-foreground bg-secondary">
                          {p.player.name.slice(0,2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-lg leading-none tracking-tight text-foreground">{p.player.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase tracking-wider">
                          {p.player.team || 'FA'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stat Value */}
                <div className="px-5 pb-4 text-center relative z-10">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black tracking-tighter text-foreground drop-shadow-sm">{p.value}</span>
                  </div>
                  <div className="text-xs font-bold text-primary uppercase tracking-widest mt-1">{p.statType}</div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-px bg-border mt-2">
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
                      group relative flex flex-col items-center justify-center py-4 transition-all duration-200
                      ${isMore 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-card hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <span className="text-[10px] uppercase font-black tracking-widest mb-1 group-hover:scale-110 transition-transform">More</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isMore ? "animate-bounce" : ""}>
                      <path d="M18 15l-6-6-6 6"/>
                    </svg>
                    {isMore && <div className="absolute inset-0 ring-inset ring-2 ring-green-500" />}
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
                      group relative flex flex-col items-center justify-center py-4 transition-all duration-200
                      ${isLess 
                        ? 'bg-red-500/10 text-red-500' 
                        : 'bg-card hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <span className="text-[10px] uppercase font-black tracking-widest mb-1 group-hover:scale-110 transition-transform">Less</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isLess ? "animate-bounce" : ""}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                    {isLess && <div className="absolute inset-0 ring-inset ring-2 ring-red-500" />}
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
