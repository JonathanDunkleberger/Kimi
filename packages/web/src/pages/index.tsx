import React from "react";
import EntrySlip from "../components/EntrySlip";
import { useBetSlip } from "../store/betSlipStore";
import ProjectionBoard from "../components/ProjectionBoard";

export default function Home() {
  const [slipOpen, setSlipOpen] = React.useState(false);
  const { selections } = useBetSlip();

  React.useEffect(() => {
    if (selections.length > 0) setSlipOpen(true);
  }, [selections]);

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Board
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Daily Fantasy Valorant • Tier 1 VCT & Game Changers
          </p>
        </div>
      </div>
      <section>
        <ProjectionBoard />
      </section>
      <EntrySlip open={slipOpen} onOpenChange={setSlipOpen} />
      <button
        onClick={() => setSlipOpen(true)}
        className="md:hidden fixed bottom-5 right-5 z-50 rounded-full bg-primary text-primary-foreground shadow-xl px-6 py-3 text-sm font-bold tracking-wide ring-2 ring-offset-2 ring-primary"
      >
        Slip ({selections.length})
      </button>
    </main>
  );
}