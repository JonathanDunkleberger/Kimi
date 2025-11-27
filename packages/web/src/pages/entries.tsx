import React, { useState } from 'react';
import { useEntries } from '../lib/api';
import { useAuth } from '@/lib/authClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EntriesPage() {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = React.useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'LIVE' | 'PAST'>('LIVE');

  React.useEffect(() => { 
    (async () => { 
      if (isSignedIn) { 
        try { 
          const t = await getToken({ template: 'default' }); 
          setToken(t || undefined); 
        } catch {} 
      } else { 
        setToken(undefined); 
      } 
    })(); 
  }, [isSignedIn, getToken]);

  const { entries, error, isLoading, refresh } = useEntries(token);

  // Calculate Profit/Loss
  // Only consider settled bets (isWin !== null/undefined)
  const settledEntries = entries.filter(e => e.isWin !== null && e.isWin !== undefined);
  const totalWagered = settledEntries.reduce((sum, e) => sum + e.wager, 0);
  const totalWon = settledEntries.reduce((sum, e) => e.isWin ? sum + e.payout : sum, 0);
  const netProfit = totalWon - totalWagered;

  // Filter entries by tab
  const liveEntries = entries.filter(e => e.isWin === null || e.isWin === undefined);
  const pastEntries = entries.filter(e => e.isWin !== null && e.isWin !== undefined);
  
  // Sort by date desc
  liveEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  pastEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayEntries = activeTab === 'LIVE' ? liveEntries : pastEntries;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground animate-pulse">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p>Loading lineups...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header & P/L */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">My Lineups</h1>
          <p className="text-muted-foreground text-sm">Track your active and past entries.</p>
        </div>
        
        <Card className="bg-card border-border/60 shadow-sm min-w-[200px]">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Net Profit / Loss</span>
            <span className={`text-2xl font-mono font-black ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-1">
        <button
          onClick={() => setActiveTab('LIVE')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'LIVE' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Live ({liveEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('PAST')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'PAST' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Past ({pastEntries.length})
        </button>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {displayEntries.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No {activeTab.toLowerCase()} lineups found.
          </div>
        )}

        {displayEntries.map(e => {
          const isWin = e.isWin;
          const statusColor = isWin === true ? 'border-green-500/50 bg-green-500/5' : isWin === false ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card';
          const statusText = isWin === true ? 'WON' : isWin === false ? 'LOST' : 'LIVE';
          const statusTextColor = isWin === true ? 'text-green-500' : isWin === false ? 'text-red-500' : 'text-primary';

          return (
            <Card key={e.id} className={`overflow-hidden border ${statusColor} transition-all hover:shadow-md`}>
              <div className="p-4 flex flex-col md:flex-row gap-4 md:items-center justify-between border-b border-border/40 bg-background/40">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-xs border ${statusTextColor} border-current bg-background`}>
                    {statusText}
                  </div>
                  <div>
                    <div className="font-bold text-sm">Entry #{e.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Entry</span>
                    <span className="font-bold">${e.wager.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">To Win</span>
                    <span className="font-bold text-green-500">${e.payout.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {e.picks.map(p => {
                  const pickWin = p.isWin;
                  const pickColor = pickWin === true ? 'bg-green-500/10 border-green-500/20' : pickWin === false ? 'bg-red-500/10 border-red-500/20' : 'bg-secondary/30 border-border/50';
                  
                  return (
                    <div key={p.id} className={`relative p-3 rounded-lg border ${pickColor} flex items-center gap-3`}>
                      {/* Player Image Placeholder */}
                      <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                        {p.playerProjection.player.name.slice(0,2).toUpperCase()}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{p.playerProjection.player.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase truncate">
                          {p.playerProjection.player.team} • {p.playerProjection.statType}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${p.pickType === 'MORE' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {p.pickType}
                          </span>
                          <span className="font-black text-sm">{p.playerProjection.value}</span>
                        </div>
                      </div>

                      {/* Status Icon */}
                      <div className="absolute top-3 right-3">
                        {pickWin === true && <span className="text-green-500 text-lg">✓</span>}
                        {pickWin === false && <span className="text-red-500 text-lg">✕</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}