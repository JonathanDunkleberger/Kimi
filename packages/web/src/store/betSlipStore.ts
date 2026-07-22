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
  /** Bumped every time an add is blocked because the lineup is full — drives the toast. */
  capNotice: number;
  setSlipOpen: (open: boolean) => void;
  toggle: (sel: Selection) => void;
  remove: (projectionId: string) => void;
  clear: () => void;
};

export const useBetSlip = create<BetSlipState>((set) => ({
  selections: [],
  slipOpen: false,
  capNotice: 0,
  setSlipOpen: (open) => set({ slipOpen: open }),
  toggle: (sel) =>
    set((s) => {
      const existing = s.selections.find((x) => x.projectionId === sel.projectionId);
      if (!existing) {
        if (s.selections.length >= MAX_PICKS) {
          return { capNotice: s.capNotice + 1 };
        }
        return { selections: [...s.selections, sel] };
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
      };
    }),
  remove: (id) =>
    set((s) => ({ selections: s.selections.filter((x) => x.projectionId !== id) })),
  clear: () => set({ selections: [] }),
}));
