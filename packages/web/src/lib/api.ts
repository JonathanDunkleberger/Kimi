import useSWR from "swr";

/**
 * Production uses same-origin `/api/backend` proxy (wakes sleeping Render, avoids CORS).
 * Local/dev hits Express directly unless NEXT_PUBLIC_API_URL is set.
 */
const API_BASE =
  process.env.NODE_ENV === "production"
    ? "/api/backend"
    : process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      "http://localhost:4000";



async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text() || `${r.status}`);
  return r.json() as Promise<T>;
}

export type MatchMap = {
  id: string;
  mapNumber: number;
  name: string;
  status: string;
  scoreA?: number | null;
  scoreB?: number | null;
  winner?: string | null;
};

export type Projection = {
  id: string;
  statType: string;
  value: number;
  scope: 'SERIES' | 'MAP';
  mapNumber: number;
  sigma?: number;
  isOpen: boolean;
  availability: string;
  player: {
    id: string;
    name: string;
    team: string;
    imageUrl?: string | null;
    game?: 'VALORANT' | 'COD';
    role?: string;
  };
  match: {
    id: string;
    game: 'VALORANT' | 'COD';
    format: 'BO1' | 'BO3' | 'BO5';
    scheduledAt: string;
    status: string;
    lockAt?: string | null;
    event?: string | null;
    teamA?: string | null;
    teamB?: string | null;
    mapsCompleted: number;
    scoreA: number;
    scoreB: number;
    maps?: MatchMap[];
  };
};

export function useProjections() {
  const { data, error, isLoading, mutate } = useSWR<Projection[]>(
    `${API_BASE}/projections`,
    (u: string) => jsonFetch<Projection[]>(u),
    { refreshInterval: 30_000 }
  );
  return { projections: data || [], error, isLoading, refresh: mutate };
}

export type CreateEntryBody = {
  wager: number;
  picks: { playerProjectionId: string; pickType: 'MORE' | 'LESS' }[];
};

export type Entry = {
  id: string;
  wager: number;
  payout: number;
  status?: string;
  isWin?: boolean | null;
  createdAt: string;
  picks: {
    id: string;
    pickType: string;
    lineAtLock?: number;
    isWin?: boolean | null;
    playerProjection: {
      id: string;
      statType: string;
      value: number;
      player: { id: string; name: string; team: string; imageUrl?: string | null };
      match?: { teamA?: string; teamB?: string; game?: string };
    };
  }[];
};

export async function createEntry(body: CreateEntryBody, token?: string) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return jsonFetch<Entry>(`${API_BASE}/entries`, { method: 'POST', headers, body: JSON.stringify(body) });
}

export function useEntries(token?: string) {
  const key = [token ? 'authed' : 'guest', `${API_BASE}/entries`, token || 'guest'] as const;
  const { data, error, isLoading, mutate } = useSWR<Entry[]>(key, async () => {
    const [, url, t] = key;
    const headers: HeadersInit = {};
    if (t && t !== 'guest') headers['Authorization'] = `Bearer ${t}`;
    return jsonFetch<Entry[]>(url, { headers });
  });
  return { entries: data || [], error, isLoading, refresh: mutate };
}

export type Me = {
  id: string;
  email: string | null;
  username?: string | null;
  balance: number;
  createdAt: string;
  isGuest?: boolean;
};

export async function getMe(token?: string) {
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return jsonFetch<Me>(`${API_BASE}/me`, { headers });
}

export function useMe(token?: string) {
  const key = `me:${token || 'guest'}`;
  const { data, error, isLoading, mutate } = useSWR<Me>(key, () => getMe(token));
  return { me: data, error, isLoading, refresh: mutate };
}

export type StatRow = {
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

export function useStats(game: 'ALL' | 'VALORANT' | 'COD' = 'ALL') {
  const { data, error, isLoading, mutate } = useSWR<{ game: string; players: StatRow[] }>(
    `${API_BASE}/stats?game=${game}`,
    (u: string) => jsonFetch<{ game: string; players: StatRow[] }>(u)
  );
  return { players: data?.players || [], error, isLoading, refresh: mutate };
}

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  profit: number;
  entries: number;
  winRate: number;
};

export function useLeaderboard() {
  const { data, error, isLoading } = useSWR<{ period: string; rows: LeaderboardRow[] }>(
    `${API_BASE}/leaderboard`,
    (u: string) => jsonFetch<{ period: string; rows: LeaderboardRow[] }>(u)
  );
  return { rows: data?.rows || [], period: data?.period, error, isLoading };
}

export { API_BASE };
