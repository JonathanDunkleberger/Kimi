export const MULTIPLIERS: Record<number, number> = {
  2: 3,
  3: 5,
  4: 10,
  5: 20,
  6: 25,
};

export const MIN_PICKS = 2;
export const MAX_PICKS = 6;

export function getMultiplier(pickCount: number): number {
  if (pickCount < MIN_PICKS) return 0;
  if (pickCount >= 6) return MULTIPLIERS[6];
  return MULTIPLIERS[pickCount] ?? 0;
}

export function formatCrowns(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}
