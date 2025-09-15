import React from "react";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBetSlip } from "../store/betSlipStore";
import { useAuth } from '@/lib/authClient';

export type BetSlipHandle = {
  open: () => void;
};

export default function BetSlip(props: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { selections, remove, clear } = useBetSlip();
  const { getToken, isSignedIn } = useAuth();
  const [wager, setWager] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function placeBet() {
    if (submitting) return;
    setError(null);
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
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Your Picks</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {selections.length === 0 && <div className="text-sm text-muted-foreground">No selections yet.</div>}
          <ul className="space-y-2">
            {selections.map((s) => (
              <li key={s.projectionId} className="flex items-center justify-between rounded-md border p-2">
                <div className="text-sm">{s.projectionId} • {s.pickType}</div>
                <Button size="sm" variant="ghost" onClick={() => remove(s.projectionId)}>Remove</Button>
              </li>
            ))}
          </ul>
        </div>
        <SheetFooter>
          <div className="w-full space-y-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="wager">Wager Amount</Label>
              <Input id="wager" type="number" placeholder="10" value={wager} onChange={(e)=>setWager(e.target.value)} />
            </div>
            <Button className="w-full" onClick={placeBet} disabled={selections.length === 0 || submitting}>
              {submitting ? 'Placing...' : 'Place Bet'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
