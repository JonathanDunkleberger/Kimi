/** Shared payout table — keep FE + API identical */
export const MULTIPLIERS: Record<number, number> = {
  2: 3,
  3: 5,
  4: 10,
  5: 20,
  6: 25,
};

export const MIN_PICKS = 2;
export const MAX_PICKS = 6;
export const STARTING_BALANCE = 100_000;

export function getMultiplier(pickCount: number): number {
  if (pickCount < MIN_PICKS) return 0;
  if (pickCount >= 6) return MULTIPLIERS[6];
  return MULTIPLIERS[pickCount] ?? 0;
}

export function expectedRounds(game: 'VALORANT' | 'COD', format: 'BO1' | 'BO3' | 'BO5', mapNumber?: number): number {
  // Map-level props: one map's expected rounds/time unit
  if (mapNumber && mapNumber > 0) {
    return game === 'COD' ? 1 : 22; // COD "map" = one HP/SnD/Control; VAL ~22 rounds
  }
  // Series expectancy (not max maps — expected maps played)
  const expectedMaps =
    format === 'BO1' ? 1 :
    format === 'BO3' ? 2.4 :
    3.6; // BO5
  if (game === 'COD') return expectedMaps; // damage/kills often counted per map then summed by model
  return expectedMaps * 22;
}
