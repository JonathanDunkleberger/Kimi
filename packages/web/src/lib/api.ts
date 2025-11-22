import useSWR from "swr";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(await r.text() || `${r.status}`);
  return r.json() as Promise<T>;
}

// Projections
export type Projection = { id: string; statType: string; value: number; player: { id: string; name: string; team: string; imageUrl?: string | null } };
export function useProjections() {
  const { data, error, isLoading, mutate } = useSWR<Projection[]>(`${API_BASE}/projections`, (u: string) => jsonFetch<Projection[]>(u));
  return { projections: data || [], error, isLoading, refresh: mutate };
}

// Entry creation
export type CreateEntryBody = { wager: number; picks: { playerProjectionId: string; pickType: 'MORE' | 'LESS' }[] };
export type Entry = {
  id: string;
  wager: number;
  payout: number;
  isWin?: boolean | null;
  createdAt: string;
  picks: { id: string; pickType: string; isWin?: boolean | null; playerProjection: { id: string; statType: string; value: number; player: { id: string; name: string; team: string } } }[];
};

export async function createEntry(body: CreateEntryBody, token?: string) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return jsonFetch<Entry>(`${API_BASE}/entries`, { method: 'POST', headers, body: JSON.stringify(body) });
}

export function useEntries(token?: string) {
  const key = [token ? 'authed' : 'guest', `${API_BASE}/entries`, token] as const;
  const { data, error, isLoading, mutate } = useSWR<Entry[]>(key, async (_k) => {
    const [, url, t] = key;
    const headers: HeadersInit = {};
    if (t) headers['Authorization'] = `Bearer ${t}`;
    return jsonFetch<Entry[]>(url, { headers });
  });
  return { entries: data || [], error, isLoading, refresh: mutate };
}

// Current user info
export type Me = { id: string; email: string | null; balance: number; createdAt: string };
export async function getMe(token: string) {
  const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
  return jsonFetch<Me>(`${API_BASE}/me`, { headers });
}
export function useMe(token?: string) {
  const key = token ? `me:${token}` : null;
  const { data, error, isLoading, mutate } = useSWR<Me>(key, () => getMe(token!));
  return { me: data, error, isLoading, refresh: mutate };
}