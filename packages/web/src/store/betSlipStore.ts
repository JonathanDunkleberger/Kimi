import { create } from "zustand";

export type Selection = { projectionId: string; pickType: "MORE" | "LESS" };

type BetSlipState = {
  selections: Selection[];
  toggle: (sel: Selection) => void; // replace if different pickType, remove if same
  remove: (projectionId: string) => void;
  clear: () => void;
};

export const useBetSlip = create<BetSlipState>((set) => ({
  selections: [],
  toggle: (sel: Selection) => set((s: BetSlipState) => {
    const existing = s.selections.find(x => x.projectionId === sel.projectionId);
    if (!existing) return { selections: [...s.selections, sel] };
    if (existing.pickType === sel.pickType) {
      return { selections: s.selections.filter(x => x.projectionId !== sel.projectionId) };
    }
    return { selections: s.selections.map(x => x.projectionId === sel.projectionId ? sel : x) };
  }),
  remove: (id: string) => set((s: BetSlipState) => ({ selections: s.selections.filter((x: Selection) => x.projectionId !== id) })),
  clear: () => set({ selections: [] }),
}));
