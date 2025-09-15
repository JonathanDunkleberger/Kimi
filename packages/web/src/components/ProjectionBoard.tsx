import React, { useMemo } from 'react';
import { useProjections, Projection } from '../lib/api';
import { useBetSlip } from '../store/betSlipStore';

/**
 * ProjectionBoard
 * Displays all current player projections grouped by team (approximation of match grouping until match API exposed).
 * Each projection shows player, team, stat line, and MORE / LESS selection buttons.
 */
export const ProjectionBoard: React.FC = () => {
  const { projections, isLoading, error, refresh } = useProjections();
  const { selections, toggle } = useBetSlip();

  // Group by team for now (since /projections payload contains player.team but not match info yet)
  const grouped = useMemo(() => {
    const map: Record<string, Projection[]> = {};
    for (const p of projections) {
      const key = p.player.team || 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
  }, [projections]);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading projections...</div>;
  if (error) return <div className="p-4 text-sm text-destructive">Failed to load projections</div>;
  if (!projections.length) return <div className="p-4 text-sm text-muted-foreground">No projections available.</div>;

  return (
    <div className="space-y-6">
      {grouped.map(([team, items]) => (
        <div key={team} className="border border-border rounded-md overflow-hidden shadow-sm bg-card text-card-foreground transition-colors">
          <div className="px-4 py-2 bg-secondary/60 backdrop-blur font-semibold text-sm flex items-center justify-between border-b border-border">
            <span className="tracking-wide">{team}</span>
            <button onClick={() => refresh()} className="text-xs underline text-accent hover:text-accent-foreground transition-colors">Refresh</button>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground bg-secondary/40">
                <th className="text-left px-3 py-2 font-medium">Player</th>
                <th className="text-left px-3 py-2 font-medium">Stat</th>
                <th className="text-left px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 font-medium">Pick</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => {
                const sel = selections.find(s => s.projectionId === p.id);
                const isMore = sel?.pickType === 'MORE';
                const isLess = sel?.pickType === 'LESS';
                return (
                  <tr key={p.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap font-medium tracking-wide">{p.player.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.statType}</td>
                    <td className="px-3 py-2">{p.value.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggle({ projectionId: p.id, pickType: 'MORE' })}
                          className={`px-2 py-1 rounded-md text-xs border font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-1 focus:ring-offset-background ${isMore ? 'bg-primary text-primary-foreground border-primary' : 'border-primary text-primary hover:bg-primary/10'}`}
                        >MORE</button>
                        <button
                          onClick={() => toggle({ projectionId: p.id, pickType: 'LESS' })}
                          className={`px-2 py-1 rounded-md text-xs border font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-1 focus:ring-offset-background ${isLess ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-destructive text-destructive hover:bg-destructive/10'}`}
                        >LESS</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default ProjectionBoard;
