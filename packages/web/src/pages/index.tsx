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
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Player Projections
        </h2>
      </header>
      <section>
        <ProjectionBoard />
      </section>
      <EntrySlip open={slipOpen} onOpenChange={setSlipOpen} />
      <button
        onClick={() => setSlipOpen(true)}
        className="md:hidden fixed bottom-5 right-5 rounded-full bg-primary text-primary-foreground shadow-lg px-5 py-3 text-sm font-semibold tracking-wide"
      >
        Picks ({selections.length})
      </button>
    </main>
  );
}