import { create } from "zustand";

type Selection = { prop_line_id: string; choice: "over" | "under" };

type BetSlipState = {
  selections: Selection[];
  add: (sel: Selection) => void;
  remove: (prop_line_id: string) => void;
  clear: () => void;
};

export const useBetSlip = create<BetSlipState>((set) => ({
  selections: [],
  add: (sel: Selection) => set((s: BetSlipState) => ({ selections: [...s.selections.filter((x: Selection) => x.prop_line_id !== sel.prop_line_id), sel] })),
  remove: (id: string) => set((s: BetSlipState) => ({ selections: s.selections.filter((x: Selection) => x.prop_line_id !== id) })),
  clear: () => set({ selections: [] }),
}));
