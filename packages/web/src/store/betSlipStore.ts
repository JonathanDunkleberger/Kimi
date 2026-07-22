import { create } from "zustand";
import { MAX_PICKS } from "@/lib/multipliers";

export type Selection = {
  projectionId: string;
  pickType: "MORE" | "LESS";
  player: string;
  team: string;
  imageUrl?: string | null;
  statType: string;
  value: number;
  scope: "SERIES" | "MAP";
  mapNumber: number;
  matchLabel: string;
  game: "VALORANT" | "COD";
};

type BetSlipState = {
  selections: Selection[];
  slipOpen: boolean;
  setSlipOpen: (open: boolean) => void;
  toggle: (sel: Selection) => void;
  remove: (projectionId: string) => void;
  clear: () => void;
};

export const useBetSlip = create<BetSlipState>((set) => ({
  selections: [],
  slipOpen: false,
  setSlipOpen: (open) => set({ slipOpen: open }),
  toggle: (sel) =>
    set((s) => {
      const existing = s.selections.find((x) => x.projectionId === sel.projectionId);
      if (!existing) {
        if (s.selections.length >= MAX_PICKS) {
          return { slipOpen: true };
        }
        return { selections: [...s.selections, sel], slipOpen: true };
      }
      if (existing.pickType === sel.pickType) {
        return {
          selections: s.selections.filter((x) => x.projectionId !== sel.projectionId),
        };
      }
      return {
        selections: s.selections.map((x) =>
          x.projectionId === sel.projectionId ? sel : x
        ),
        slipOpen: true,
      };
    }),
  remove: (id) =>
    set((s) => ({ selections: s.selections.filter((x) => x.projectionId !== id) })),
  clear: () => set({ selections: [] }),
}));
