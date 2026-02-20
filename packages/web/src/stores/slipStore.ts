import { create } from 'zustand';
import type { PropLine, SlipPick } from '@/types';

interface SlipStore {
  picks: SlipPick[];
  wager: number;
  addPick: (propLine: PropLine, direction: 'over' | 'under') => void;
  removePick: (propLineId: string) => void;
  togglePick: (propLine: PropLine, direction: 'over' | 'under') => void;
  setWager: (amount: number) => void;
  clearSlip: () => void;
  getMultiplier: () => number;
  getPotentialPayout: () => number;
}

const MULTIPLIERS: Record<number, number> = {
  2: 3,
  3: 5,
  4: 10,
  5: 20,
  6: 35,
};

export const useSlipStore = create<SlipStore>((set, get) => ({
  picks: [],
  wager: 0,

  addPick: (propLine, direction) => {
    set((state) => ({
      picks: [
        ...state.picks.filter((p) => p.propLine.id !== propLine.id),
        { propLine, direction },
      ],
    }));
  },

  removePick: (propLineId) => {
    set((state) => ({
      picks: state.picks.filter((p) => p.propLine.id !== propLineId),
    }));
  },

  togglePick: (propLine, direction) => {
    const existing = get().picks.find((p) => p.propLine.id === propLine.id);
    if (existing?.direction === direction) {
      get().removePick(propLine.id);
    } else {
      get().addPick(propLine, direction);
    }
  },

  setWager: (amount) => set({ wager: Math.max(0, amount) }),

  clearSlip: () => set({ picks: [], wager: 0 }),

  getMultiplier: () => {
    const count = get().picks.length;
    if (count < 2) return count === 1 ? 1.8 : 0;
    return MULTIPLIERS[count] || 35;
  },

  getPotentialPayout: () => {
    const mult = get().getMultiplier();
    return Math.round(get().wager * mult);
  },
}));
