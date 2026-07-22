export type Game = 'VALORANT' | 'COD';
export type SeriesFormat = 'BO1' | 'BO3' | 'BO5';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELED';
export type MapStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELED' | 'SKIPPED';
export type PropScope = 'SERIES' | 'MAP';

export type MatchLike = {
  game: Game;
  format: SeriesFormat;
  status: MatchStatus;
  lockAt: Date | null;
  scheduledAt: Date;
  scoreA: number;
  scoreB: number;
  mapsCompleted: number;
  maps?: { mapNumber: number; status: MapStatus }[];
};

export type ProjectionLike = {
  scope: PropScope;
  mapNumber: number;
  isOpen?: boolean;
};

export function winsToClose(format: SeriesFormat): number {
  if (format === 'BO1') return 1;
  if (format === 'BO3') return 2;
  return 3;
}

export function maxMaps(format: SeriesFormat): number {
  if (format === 'BO1') return 1;
  if (format === 'BO3') return 3;
  return 5;
}

export function seriesDecided(match: MatchLike): boolean {
  const need = winsToClose(match.format);
  return (
    match.scoreA >= need ||
    match.scoreB >= need ||
    match.status === 'COMPLETED' ||
    match.status === 'CANCELED'
  );
}

/**
 * Map N betting unlock rules:
 * - Map 1: open until map 1 goes LIVE
 * - Map N>1: unlocks only after map N-1 COMPLETED, and only if series still needs that map
 * - Series props: open until lockAt / match LIVE
 */
export function isMapBettingOpen(match: MatchLike, mapNumber: number, _now = new Date()): boolean {
  if (match.status === 'CANCELED' || match.status === 'COMPLETED') return false;
  if (seriesDecided(match)) return false;
  if (mapNumber < 1 || mapNumber > maxMaps(match.format)) return false;

  const maps = match.maps ?? [];
  const thisMap = maps.find((m) => m.mapNumber === mapNumber);
  if (
    thisMap &&
    (thisMap.status === 'LIVE' ||
      thisMap.status === 'COMPLETED' ||
      thisMap.status === 'SKIPPED' ||
      thisMap.status === 'CANCELED')
  ) {
    return false;
  }

  if (mapNumber === 1) {
    if (match.status === 'LIVE' && match.mapsCompleted >= 1) return false;
    if (thisMap?.status === 'LIVE') return false;
    return true;
  }

  const prev = maps.find((m) => m.mapNumber === mapNumber - 1);
  if (!prev || prev.status !== 'COMPLETED') return false;
  return !seriesDecided(match);
}

export function isSeriesBettingOpen(match: MatchLike, now = new Date()): boolean {
  if (match.status === 'CANCELED' || match.status === 'COMPLETED' || match.status === 'LIVE') {
    return false;
  }
  if (match.lockAt && now >= match.lockAt) return false;
  if (!match.lockAt) {
    const soft = new Date(match.scheduledAt.getTime() - 5 * 60 * 1000);
    if (now >= soft) return false;
  }
  return true;
}

export function isProjectionAvailable(
  match: MatchLike,
  proj: ProjectionLike,
  now = new Date()
): boolean {
  if (proj.isOpen === false) return false;
  if (proj.scope === 'SERIES' || proj.mapNumber === 0) {
    return isSeriesBettingOpen(match, now);
  }
  return isMapBettingOpen(match, proj.mapNumber, now);
}

export function availabilityLabel(
  match: MatchLike,
  proj: ProjectionLike,
  now = new Date()
): string {
  if (isProjectionAvailable(match, proj, now)) {
    if (proj.scope === 'MAP' && proj.mapNumber > 0) return `Map ${proj.mapNumber} · Open`;
    return 'Series · Open';
  }
  if (proj.scope === 'MAP' && proj.mapNumber > 1) {
    if (seriesDecided(match)) return 'Series closed';
    const prev = match.maps?.find((m) => m.mapNumber === proj.mapNumber - 1);
    if (!prev || prev.status !== 'COMPLETED') return `Unlocks after Map ${proj.mapNumber - 1}`;
  }
  return 'Locked';
}
