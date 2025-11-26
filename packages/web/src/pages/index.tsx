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
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Kimi
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Daily Fantasy Valorant • Tier 1 VCT & Game Changers
          </p>
        </div>
      </header>
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