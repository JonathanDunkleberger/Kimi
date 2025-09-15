import React from 'react';
import { useBetSlip } from '../store/betSlipStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/lib/authClient';

/**
 * EntrySlip
 * Persistent sidebar (or drawer on mobile) for building an entry.
 */
export default function EntrySlip({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { selections, remove, clear } = useBetSlip();
  const { getToken, isSignedIn } = useAuth();
  const [wager, setWager] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function submit() {
    if (submitting) return;
    setError(null); setSuccess(null);
    const stake = parseInt(wager, 10);
    if (!stake || stake <= 0) { setError('Enter a valid wager'); return; }
    if (selections.length === 0) { setError('No selections'); return; }
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
      if (!resp.ok) throw new Error(json.error || 'Failed to place entry');
      clear();
      setWager('');
      setSuccess('Entry placed');
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`fixed top-0 right-0 h-full w-[360px] max-w-full z-40 transform transition-transform duration-300 bg-card/80 backdrop-blur border-l border-border shadow-xl flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 flex items-center justify-between border-b border-border/60">
        <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Your Entry</h4>
        <button onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {error && <div className="text-xs rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-2 py-1">{error}</div>}
        {success && <div className="text-xs rounded-md border border-primary/40 bg-primary/10 text-primary px-2 py-1">{success}</div>}
        {selections.length === 0 && <div className="text-sm text-muted-foreground">No selections yet.</div>}
        <ul className="space-y-2">
          {selections.map(s => (
            <li key={s.projectionId} className="rounded-md border border-border/60 p-2 flex items-center justify-between gap-2 bg-background/40">
              <div className="text-xs font-mono truncate" title={s.projectionId}>{s.projectionId}</div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.pickType === 'MORE' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>{s.pickType}</span>
                <button onClick={() => remove(s.projectionId)} className="text-[10px] text-muted-foreground hover:text-destructive">✕</button>
              </div>
            </li>
          ))}
        </ul>
        {selections.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="grid gap-1.5">
              <Label htmlFor="wager" className="text-xs">Wager</Label>
              <Input id="wager" type="number" min={1} value={wager} onChange={e=>setWager(e.target.value)} placeholder="10" className="h-8 text-sm" />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{selections.length} picks</span>
              <span>Payout: TBD</span>
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full h-9 text-sm">
              {submitting ? 'Submitting...' : 'Place Entry'}
            </Button>
            <Button type="button" variant="ghost" disabled={submitting || selections.length===0} onClick={clear} className="w-full h-8 text-xs">Clear</Button>
          </div>
        )}
      </div>
    </div>
  );
}
