/**
 * Curated demo slate so the app feels alive without live PandaScore/ML.
 * Mix of Valorant Bo3 + CoD Bo5 with map-gate logic.
 */

export type DemoPlayer = {
  id: string;
  name: string;
  team: string;
  game: 'VALORANT' | 'COD';
  imageUrl: string;
  role?: string;
};

export type DemoMap = {
  id: string;
  mapNumber: number;
  name: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELED' | 'SKIPPED';
  scoreA?: number;
  scoreB?: number;
  winner?: string;
};

export type DemoMatch = {
  id: string;
  game: 'VALORANT' | 'COD';
  format: 'BO1' | 'BO3' | 'BO5';
  scheduledAt: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELED';
  lockAt: string;
  event: string;
  teamA: string;
  teamB: string;
  mapsCompleted: number;
  scoreA: number;
  scoreB: number;
  maps: DemoMap[];
};

export type DemoProjection = {
  id: string;
  playerId: string;
  matchId: string;
  statType: string;
  value: number;
  scope: 'SERIES' | 'MAP';
  mapNumber: number;
  sigma?: number;
};

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600_000).toISOString();
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

/** Fallback initials avatar */
export function avatar(seed: string) {
  const q = new URLSearchParams({
    seed,
    backgroundColor: '151922',
    radius: '50',
  });
  return `https://api.dicebear.com/9.x/initials/svg?${q.toString()}`;
}

const PHOTOS: Record<string, string> = {
  TenZ: 'https://owcdn.net/img/6416950ce6638.png',
  zekken: 'https://owcdn.net/img/69742b2cdd6c3.png',
  johnqt: 'https://owcdn.net/img/69741441b9923.png',
  Sacy: 'https://owcdn.net/img/6416954a0788d.png',
  Zellsis: 'https://owcdn.net/img/671b20fca8019.png',
  Chronicle: 'https://owcdn.net/img/6977a6d8e354a.png',
  Boaster: 'https://owcdn.net/img/687e2c495dcc6.png',
  Alfajer: 'https://owcdn.net/img/687e2c40ac175.png',
  crashies: 'https://owcdn.net/img/687e2c376a05d.png',
  Shotzzy: 'https://dfpiiufxcciujugzjvgx.supabase.co/storage/v1/object/public/players/2026/m1/Shotzzy.webp',
  Dashy: 'https://dfpiiufxcciujugzjvgx.supabase.co/storage/v1/object/public/players/2026/m1/Dashy.webp',
  Kenny: 'https://dfpiiufxcciujugzjvgx.supabase.co/storage/v1/object/public/players/2026/m1/Kenny.webp',
  Envoy: 'https://dfpiiufxcciujugzjvgx.supabase.co/storage/v1/object/public/players/2026/m1/Envoy.webp',
  Ghosty: 'https://dfpiiufxcciujugzjvgx.supabase.co/storage/v1/object/public/players/2026/m1/Ghosty.webp',
  Kremp: 'https://dfpiiufxcciujugzjvgx.supabase.co/storage/v1/object/public/players/2026/m1/Kremp.webp',
};

function photo(name: string) {
  return PHOTOS[name] || avatar(name);
}

export const DEMO_PLAYERS: DemoPlayer[] = [
  { id: 'val-tenz', name: 'TenZ', team: 'Sentinels', game: 'VALORANT', role: 'Duelist', imageUrl: photo('TenZ') },
  { id: 'val-zekken', name: 'zekken', team: 'Sentinels', game: 'VALORANT', role: 'Duelist', imageUrl: photo('zekken') },
  { id: 'val-johnqt', name: 'johnqt', team: 'Sentinels', game: 'VALORANT', role: 'IGL', imageUrl: photo('johnqt') },
  { id: 'val-sacy', name: 'Sacy', team: 'Sentinels', game: 'VALORANT', role: 'Initiator', imageUrl: photo('Sacy') },
  { id: 'val-zellsis', name: 'Zellsis', team: 'Sentinels', game: 'VALORANT', role: 'Flex', imageUrl: photo('Zellsis') },
  { id: 'val-chronicle', name: 'Chronicle', team: 'Fnatic', game: 'VALORANT', role: 'Flex', imageUrl: photo('Chronicle') },
  { id: 'val-boaster', name: 'Boaster', team: 'Fnatic', game: 'VALORANT', role: 'IGL', imageUrl: photo('Boaster') },
  { id: 'val-alfajer', name: 'Alfajer', team: 'Fnatic', game: 'VALORANT', role: 'Duelist', imageUrl: photo('Alfajer') },
  { id: 'val-crashies', name: 'crashies', team: 'Fnatic', game: 'VALORANT', role: 'Initiator', imageUrl: photo('crashies') },
  { id: 'val-kaajak', name: 'kaajak', team: 'Fnatic', game: 'VALORANT', role: 'Duelist', imageUrl: photo('kaajak') },
  { id: 'cod-shotzzy', name: 'Shotzzy', team: 'OpTic Texas', game: 'COD', role: 'SMG', imageUrl: photo('Shotzzy') },
  { id: 'cod-dashy', name: 'Dashy', team: 'OpTic Texas', game: 'COD', role: 'AR', imageUrl: photo('Dashy') },
  { id: 'cod-kenny', name: 'Kenny', team: 'OpTic Texas', game: 'COD', role: 'AR', imageUrl: photo('Kenny') },
  { id: 'cod-antis', name: 'Ant', team: 'OpTic Texas', game: 'COD', role: 'SMG', imageUrl: photo('Ant') },
  { id: 'cod-envoy', name: 'Envoy', team: 'LA Thieves', game: 'COD', role: 'SMG', imageUrl: photo('Envoy') },
  { id: 'cod-octane', name: 'Octane', team: 'LA Thieves', game: 'COD', role: 'AR', imageUrl: photo('Octane') },
  { id: 'cod-ghosty', name: 'Ghosty', team: 'LA Thieves', game: 'COD', role: 'AR', imageUrl: photo('Ghosty') },
  { id: 'cod-kremp', name: 'Kremp', team: 'LA Thieves', game: 'COD', role: 'SMG', imageUrl: photo('Kremp') },
];

export const DEMO_MATCHES: DemoMatch[] = [
  {
    id: 'match-val-sen-fnc',
    game: 'VALORANT',
    format: 'BO3',
    scheduledAt: hoursFromNow(2),
    status: 'SCHEDULED',
    lockAt: hoursFromNow(1.9),
    event: 'VCT Americas · Group Stage',
    teamA: 'Sentinels',
    teamB: 'Fnatic',
    mapsCompleted: 0,
    scoreA: 0,
    scoreB: 0,
    maps: [
      { id: 'mm-1', mapNumber: 1, name: 'Ascent', status: 'SCHEDULED' },
      { id: 'mm-2', mapNumber: 2, name: 'Lotus', status: 'SCHEDULED' },
      { id: 'mm-3', mapNumber: 3, name: 'TBD', status: 'SCHEDULED' },
    ],
  },
  {
    id: 'match-val-live',
    game: 'VALORANT',
    format: 'BO3',
    scheduledAt: hoursAgo(0.5),
    status: 'LIVE',
    lockAt: hoursAgo(0.6),
    event: 'VCT Pacific · Decider',
    teamA: 'Sentinels',
    teamB: 'Fnatic',
    mapsCompleted: 1,
    scoreA: 1,
    scoreB: 0,
    maps: [
      { id: 'mm-l1', mapNumber: 1, name: 'Bind', status: 'COMPLETED', scoreA: 13, scoreB: 9, winner: 'Sentinels' },
      { id: 'mm-l2', mapNumber: 2, name: 'Haven', status: 'LIVE' },
      { id: 'mm-l3', mapNumber: 3, name: 'TBD', status: 'SCHEDULED' },
    ],
  },
  {
    id: 'match-cod-optic-lat',
    game: 'COD',
    format: 'BO5',
    scheduledAt: hoursFromNow(4),
    status: 'SCHEDULED',
    lockAt: hoursFromNow(3.9),
    event: 'CDL Major · Winners Bracket',
    teamA: 'OpTic Texas',
    teamB: 'LA Thieves',
    mapsCompleted: 0,
    scoreA: 0,
    scoreB: 0,
    maps: [
      { id: 'cm-1', mapNumber: 1, name: 'Hardpoint · Invasion', status: 'SCHEDULED' },
      { id: 'cm-2', mapNumber: 2, name: 'Search & Destroy · Karachi', status: 'SCHEDULED' },
      { id: 'cm-3', mapNumber: 3, name: 'Hardpoint · Skidrow', status: 'SCHEDULED' },
      { id: 'cm-4', mapNumber: 4, name: 'Control · Highrise', status: 'SCHEDULED' },
      { id: 'cm-5', mapNumber: 5, name: 'Search & Destroy · Invasion', status: 'SCHEDULED' },
    ],
  },
];

function line(playerId: string, matchId: string, stat: string, value: number, scope: 'SERIES' | 'MAP', mapNumber = 0): DemoProjection {
  return {
    id: `proj-${playerId}-${matchId}-${stat}-m${mapNumber}`,
    playerId,
    matchId,
    statType: stat,
    value,
    scope,
    mapNumber,
    sigma: Math.max(1.2, value * 0.12),
  };
}

export function buildDemoProjections(): DemoProjection[] {
  const out: DemoProjection[] = [];
  const sen = DEMO_PLAYERS.filter((p) => p.team === 'Sentinels');
  const fnc = DEMO_PLAYERS.filter((p) => p.team === 'Fnatic');
  const optic = DEMO_PLAYERS.filter((p) => p.team === 'OpTic Texas');
  const lat = DEMO_PLAYERS.filter((p) => p.team === 'LA Thieves');

  const valLines: Record<string, number> = {
    TenZ: 22.5, zekken: 21.5, johnqt: 16.5, Sacy: 15.5, Zellsis: 17.5,
    Chronicle: 18.5, Boaster: 14.5, Alfajer: 20.5, crashies: 15.5, kaajak: 19.5,
  };

  for (const p of [...sen, ...fnc]) {
    const kills = valLines[p.name] ?? 17.5;
    out.push(line(p.id, 'match-val-sen-fnc', 'Kills', kills, 'SERIES', 0));
    out.push(line(p.id, 'match-val-sen-fnc', 'ACS', Math.round(kills * 10 + 40) + 0.5, 'SERIES', 0));
    out.push(line(p.id, 'match-val-sen-fnc', 'Kills', Math.round(kills * 0.42 * 2) / 2, 'MAP', 1));
    out.push(line(p.id, 'match-val-sen-fnc', 'Kills', Math.round(kills * 0.42 * 2) / 2, 'MAP', 2));
    out.push(line(p.id, 'match-val-sen-fnc', 'Kills', Math.round(kills * 0.4 * 2) / 2, 'MAP', 3));
    out.push(line(p.id, 'match-val-live', 'Kills', kills - 1, 'SERIES', 0));
    out.push(line(p.id, 'match-val-live', 'Kills', Math.round(kills * 0.4 * 2) / 2, 'MAP', 2));
    out.push(line(p.id, 'match-val-live', 'Kills', Math.round(kills * 0.4 * 2) / 2, 'MAP', 3));
  }

  const codKills: Record<string, number> = {
    Shotzzy: 28.5, Dashy: 24.5, Kenny: 22.5, Ant: 26.5,
    Envoy: 25.5, Octane: 23.5, Ghosty: 21.5, Kremp: 24.5,
  };
  for (const p of [...optic, ...lat]) {
    const k = codKills[p.name] ?? 23.5;
    out.push(line(p.id, 'match-cod-optic-lat', 'Kills', k, 'SERIES', 0));
    out.push(line(p.id, 'match-cod-optic-lat', 'Damage', Math.round(k * 95), 'SERIES', 0));
    for (let m = 1; m <= 5; m++) {
      out.push(line(p.id, 'match-cod-optic-lat', 'Kills', Math.round(k * 0.22 * 2) / 2, 'MAP', m));
    }
  }

  return out;
}

export type DemoLeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  profit: number;
  entries: number;
  winRate: number;
};

export const DEMO_LEADERBOARD: DemoLeaderboardRow[] = [
  { rank: 1, userId: 'u1', username: 'optic_lock', profit: 48200, entries: 34, winRate: 0.41 },
  { rank: 2, userId: 'u2', username: 'sen_stack', profit: 35100, entries: 28, winRate: 0.39 },
  { rank: 3, userId: 'u3', username: 'faze_flex', profit: 28950, entries: 41, winRate: 0.37 },
  { rank: 4, userId: 'u4', username: 'map2_merchant', profit: 22100, entries: 19, winRate: 0.42 },
  { rank: 5, userId: 'u5', username: 'guest_user_123', profit: 15400, entries: 22, winRate: 0.36 },
  { rank: 6, userId: 'u6', username: 'kd_clerk', profit: 9800, entries: 15, winRate: 0.33 },
  { rank: 7, userId: 'u7', username: 'six_leg_sam', profit: 7200, entries: 12, winRate: 0.5 },
  { rank: 8, userId: 'u8', username: 'underdog_u', profit: 4100, entries: 30, winRate: 0.3 },
];

export type DemoStatRow = {
  playerId: string;
  name: string;
  team: string;
  game: 'VALORANT' | 'COD';
  imageUrl: string;
  maps: number;
  kills: number;
  deaths: number;
  assists: number;
  rating: number;
  acs?: number;
  damage?: number;
  hsPercent?: number;
};

export function buildDemoStats(): DemoStatRow[] {
  return DEMO_PLAYERS.map((p, i) => {
    const base = 18 + (i % 7) * 1.4;
    return {
      playerId: p.id,
      name: p.name,
      team: p.team,
      game: p.game,
      imageUrl: p.imageUrl,
      maps: 24 + (i % 11),
      kills: Math.round(base * (24 + (i % 11))),
      deaths: Math.round(base * 0.92 * (24 + (i % 11))),
      assists: Math.round(base * 0.45 * (24 + (i % 11))),
      rating: Math.round((0.95 + (i % 9) * 0.04) * 100) / 100,
      acs: p.game === 'VALORANT' ? Math.round(200 + (i % 8) * 12) : undefined,
      damage: p.game === 'COD' ? Math.round(2800 + (i % 8) * 180) : undefined,
      hsPercent: Math.round((22 + (i % 10) * 1.5) * 10) / 10,
    };
  });
}
