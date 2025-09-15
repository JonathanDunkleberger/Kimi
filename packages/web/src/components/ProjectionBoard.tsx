import React from 'react';
import { useProjections } from '../lib/api';
import { useBetSlip } from '../store/betSlipStore';

export const ProjectionBoard: React.FC = () => {
  const { projections, isLoading, error, refresh } = useProjections();
  const { selections, toggle } = useBetSlip();

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading projections...</div>;
  if (error) return <div className="p-4 text-sm text-destructive">Failed to load projections</div>;
  if (!projections.length) return <div className="p-4 text-sm text-muted-foreground">No projections available.</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Projections</h3>
  <button onClick={() => refresh()} className="text-xs underline text-accent hover:text-accent-foreground">Refresh</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projections.map(p => {
          const sel = selections.find(s => s.projectionId === p.id);
          const isMore = sel?.pickType === 'MORE';
          const isLess = sel?.pickType === 'LESS';
          const selected = !!sel;
          return (
            <div
              key={p.id}
              className={`relative group border rounded-lg p-3 backdrop-blur shadow-sm hover:shadow transition-all flex flex-col gap-2
              ${selected ? 'border-primary/70 ring-1 ring-primary/50 bg-gradient-to-br from-primary/15 via-card/60 to-background/20' : 'border-border/60 bg-card/60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium leading-tight">{p.player.name}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{p.player.team || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{p.value.toFixed(1)}</div>
                  <div className="text-[11px] text-muted-foreground">{p.statType}</div>
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => toggle({ projectionId: p.id, pickType: 'MORE' })}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-1 focus:ring-offset-background ${isMore ? 'bg-primary text-primary-foreground border-primary' : 'border-primary/70 text-primary hover:bg-primary/10'}`}
                >MORE</button>
                <button
                  onClick={() => toggle({ projectionId: p.id, pickType: 'LESS' })}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-1 focus:ring-offset-background ${isLess ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-destructive/70 text-destructive hover:bg-destructive/10'}`}
                >LESS</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectionBoard;
