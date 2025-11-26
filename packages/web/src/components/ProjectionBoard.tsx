import React from 'react';
import { useProjections } from '../lib/api';
import { useBetSlip } from '../store/betSlipStore';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

export const ProjectionBoard: React.FC = () => {
  const { projections, isLoading, error, refresh } = useProjections();
  const { selections, toggle } = useBetSlip();
  const [activeStat, setActiveStat] = React.useState<string>('ALL');

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading projections...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Failed to load projections. Please try again later.</div>;
  if (!projections.length) return <div className="p-8 text-center text-muted-foreground">No projections available at the moment.</div>;

  const stats = Array.from(new Set(projections.map(p => p.statType))).sort();
  const filtered = activeStat === 'ALL' ? projections : projections.filter(p => p.statType === activeStat);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full sm:w-auto">
          <Button
            variant={activeStat === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveStat('ALL')}
            className="rounded-full"
          >
            ALL
          </Button>
          {stats.map(s => (
            <Button
              key={s}
              variant={activeStat === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveStat(s)}
              className="rounded-full whitespace-nowrap"
            >
              {s}
            </Button>
          ))}
        </div>
        <button onClick={() => refresh()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Refresh Data
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
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${selected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
            >
              <CardContent className="p-4 space-y-4">
                {/* Header: Player Info & Value */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-secondary border border-border shrink-0">
                      {p.player.imageUrl ? (
                        <img
                          src={p.player.imageUrl}
                          alt={p.player.name}
                          className="w-full h-full object-cover"
                          onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {p.player.name.slice(0,2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-tight line-clamp-1">{p.player.name}</h4>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{p.player.team || 'FA'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black tracking-tighter leading-none text-foreground">{p.value}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-1">{p.statType}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
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
                      relative flex flex-col items-center justify-center py-2 px-1 rounded-md border transition-all duration-200
                      ${isMore 
                        ? 'bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 font-bold' 
                        : 'border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider mb-0.5">More</span>
                    {isMore && <div className="absolute inset-0 ring-1 ring-inset ring-green-500 rounded-md" />}
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
                      relative flex flex-col items-center justify-center py-2 px-1 rounded-md border transition-all duration-200
                      ${isLess 
                        ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-bold' 
                        : 'border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider mb-0.5">Less</span>
                    {isLess && <div className="absolute inset-0 ring-1 ring-inset ring-red-500 rounded-md" />}
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
