import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBetSlip } from "../store/betSlipStore";
import { useAuth } from '@/lib/authClient';
// @ts-ignore
import { JerseyPlaceholder } from "@/components/ui/jersey";
import { X, Trash2 } from 'lucide-react';

const getMultiplier = (count: number) => {
  if (count < 2) return 0;
  if (count === 2) return 3;
  if (count === 3) return 5;
  if (count === 4) return 10;
  if (count >= 5) return 20;
  return 0;
};

export default function BetSlip() {
  const { selections, remove, clear, toggle } = useBetSlip();
  const { getToken, isSignedIn } = useAuth();
  const [wager, setWager] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const stake = parseFloat(wager) || 0;
  const multiplier = getMultiplier(selections.length);
  const toWin = stake * multiplier;
  const valid = selections.length >= 2 && stake > 0;

  async function placeBet() {
    if (submitting || !valid) return;
    setError(null);
    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      const picks = selections.map(s => ({ 
        playerProjectionId: s.projectionId, 
        pickType: s.pickType 
      }));
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (isSignedIn) {
        try { 
          const token = await getToken({ template: 'default' }); 
          if (token) headers['Authorization'] = `Bearer ${token}`; 
        } catch {}
      }
      
      const resp = await fetch(`${apiBase}/entries`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ wager: stake, picks }) 
      });
      
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Failed to place entry');
      
      clear();
      setWager("");
      // Could show success toast here
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (selections.length === 0) {
    return (
      <div className="w-full bg-card border border-border rounded-xl p-6 text-center shadow-sm">
        <div className="mb-4 flex items-center justify-center text-muted-foreground">
          <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-foreground">Your slip is empty</h3>
        <p className="text-sm text-muted-foreground mt-1">Select a player projection to start building your entry.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden max-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground font-black text-xs w-6 h-6 flex items-center justify-center rounded-full">
            {selections.length}
          </div>
          <span className="font-bold text-sm tracking-tight">Selections</span>
        </div>
        <Button variant="ghost" size="icon" onClick={clear} className="h-6 w-6 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {selections.map((s) => (
          <div key={s.projectionId} className="relative group bg-secondary/20 rounded-lg border border-border/50 p-3 hover:border-primary/30 transition-all">
            <button 
              onClick={() => remove(s.projectionId)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-12 h-12 rounded overflow-hidden bg-background shrink-0 border border-border">
                 <JerseyPlaceholder team={s.team} className="w-full h-full" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-sm truncate leading-tight">{s.player}</div>
                <div className="text-[10px] sm:text-xs font-bold text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="truncate max-w-[60px]">{s.team}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-primary truncate">{s.statType}</span>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="font-black text-xl leading-none w-10">{s.value}</div>
                  <div className="flex bg-background rounded-md border border-border divide-x divide-border h-6 flex-1">
                   <button 
                    onClick={() => toggle({ ...s, pickType: 'MORE' })}
                    className={`flex-1 px-2 text-[10px] font-bold uppercase transition-colors ${s.pickType === 'MORE' ? 'bg-green-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                   >
                    More
                   </button>
                   <button 
                    onClick={() => toggle({ ...s, pickType: 'LESS' })}
                    className={`flex-1 px-2 text-[10px] font-bold uppercase transition-colors ${s.pickType === 'LESS' ? 'bg-red-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                   >
                    Less
                   </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Calculation */}
      <div className="p-4 bg-secondary/10 border-t border-border mt-auto space-y-4">
        {selections.length < 2 && (
          <div className="text-xs text-center text-amber-500 font-bold bg-amber-500/10 py-2 rounded">
            Add {2 - selections.length} more pick{2 - selections.length > 1 && 's'} to place entry
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>Entry Multiplier</span>
            <span className="text-foreground">{multiplier}x</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out" 
              style={{ width: `${Math.min((selections.length / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Wager</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <Input 
                type="number" 
                value={wager} 
                onChange={e => setWager(e.target.value)}
                className="pl-5 h-9 font-bold bg-background text-right"
                placeholder="10"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">To Win</label>
            <div className="h-9 px-3 flex items-center justify-end font-black text-green-500 bg-green-500/10 border border-green-500/20 rounded-md">
              ${toWin.toFixed(2)}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs text-destructive font-bold text-center bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full font-black text-base uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          disabled={!valid || submitting}
          onClick={placeBet}
        >
          {submitting ? 'Placing...' : 'Place Entry'}
        </Button>
      </div>
    </div>
  );
}
