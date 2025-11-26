import React from "react";
import { useBetSlip } from "../store/betSlipStore";
import ProjectionBoard from "../components/ProjectionBoard";

export default function Home() {
  const { selections } = useBetSlip();
  
  // We use the global slip context from Layout, so we just need to trigger it if needed.
  // But actually, Layout handles the slip state. We might want a way to open it from here.
  // For now, let's just show the board. The Layout has the slip.

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
      <button
        onClick={() => window.dispatchEvent(new Event('open-slip'))}
        className="md:hidden fixed bottom-5 right-5 z-50 rounded-full bg-primary text-primary-foreground shadow-xl px-6 py-3 text-sm font-bold tracking-wide ring-2 ring-offset-2 ring-primary"
      >
        Slip ({selections.length})
      </button>
    </main>
  );
}