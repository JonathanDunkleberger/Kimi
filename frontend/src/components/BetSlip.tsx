import React from "react";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBetSlip } from "../store/betSlipStore";

export type BetSlipHandle = {
  open: () => void;
};

export default function BetSlip(props: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { selections, remove, clear } = useBetSlip();
  const [wager, setWager] = React.useState<string>("");

  function placeBet() {
    // TODO: wire to actual API once ready
    clear();
    props.onOpenChange(false);
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Your Picks</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-3">
          {selections.length === 0 && <div className="text-sm text-muted-foreground">No selections yet.</div>}
          <ul className="space-y-2">
            {selections.map((s) => (
              <li key={s.prop_line_id} className="flex items-center justify-between rounded-md border p-2">
                <div className="text-sm">{s.prop_line_id} • {s.choice.toUpperCase()}</div>
                <Button size="sm" variant="ghost" onClick={() => remove(s.prop_line_id)}>Remove</Button>
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
            <Button className="w-full" onClick={placeBet} disabled={selections.length === 0}>Place Bet</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
