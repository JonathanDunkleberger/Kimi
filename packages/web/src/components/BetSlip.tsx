import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBetSlip } from "../store/betSlipStore";
import { useAuth } from '@/lib/authClient';

export default function BetSlip(props: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { selections, remove, clear } = useBetSlip();
  const { getToken, isSignedIn } = useAuth();
  const [wager, setWager] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Auto-open if 2+ selections
  React.useEffect(() => {
    if (selections.length >= 2 && !props.open) {
      props.onOpenChange(true);
    }
  }, [selections.length, props.open, props.onOpenChange]);

  if (!props.open && selections.length < 2) return null;

  const stake = parseFloat(wager) || 0;
  const multiplier = selections.length === 2 ? 3 : selections.length === 3 ? 5 : selections.length * 2; // Simplified logic
  const toWin = stake * multiplier;

  async function placeBet() {
    if (submitting) return;
    setError(null);
    if (!stake || stake <= 0) { setError('Enter a valid wager'); return; }
    if (selections.length < 2) { setError('Select at least 2 picks'); return; }
    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
      const picks = selections.map(s => ({ playerProjectionId: s.projectionId, pickType: s.pickType }));
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (isSignedIn) {
        try { const token = await getToken({ template: 'default' }); if (token) headers['Authorization'] = `Bearer ${token}`; } catch {}
      }
      const resp = await fetch(`${apiBase}/entries`, { method: 'POST', headers, body: JSON.stringify({ wager: stake, picks }) });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Failed');
      clear();
      props.onOpenChange(false);
      setWager("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 top-20 w-[360px] bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-right-10 duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card-strong flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            {selections.length}
          </div>
          <span className="font-bold text-foreground">Current Lineup</span>
        </div>
        <button onClick={() => props.onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
          ✕
        </button>
      </div>

      {/* Selections List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selections.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Select at least 2 players to start.
          </div>
        )}
        {selections.map((s) => (
          <div key={s.projectionId} className="relative group rounded-lg border border-border bg-background/50 p-3 flex gap-3">
            <button 
              onClick={() => remove(s.projectionId)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
            
            {/* Player Image (Small) */}
            <div className="w-12 h-12 rounded-full bg-secondary shrink-0 overflow-hidden">
               {/* Placeholder or real image if we had it in selection state */}
               <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                 {s.player.slice(0,2).toUpperCase()}
               </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{s.player}</div>
              <div className="text-[10px] text-muted-foreground uppercase">{s.team} • {s.statType}</div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="font-black text-foreground">{s.value}</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${s.pickType === 'MORE' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {s.pickType}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Wager */}
      <div className="p-4 bg-card-strong border-t border-border space-y-4">
        {error && <div className="text-xs text-red-500 font-medium text-center">{error}</div>}
        
        {/* Power Play Info */}
        {selections.length >= 2 && (
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground">Power Play</span>
              <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">{multiplier}x</span>
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              All picks must win to payout.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wager" className="text-xs text-muted-foreground">Entry</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input 
                id="wager" 
                type="number" 
                className="pl-6 bg-background border-border h-10 font-bold" 
                placeholder="0" 
                value={wager} 
                onChange={(e)=>setWager(e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To Win</Label>
            <div className="h-10 flex items-center px-3 bg-background/50 border border-border/50 rounded-md font-black text-green-500">
              ${toWin.toFixed(2)}
            </div>
          </div>
        </div>

        <Button 
          className="w-full h-12 text-base font-black uppercase tracking-wider bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" 
          onClick={placeBet} 
          disabled={selections.length < 2 || submitting}
        >
          {submitting ? 'Placing...' : 'Place Entry'}
        </Button>
      </div>
    </div>
  );
}
