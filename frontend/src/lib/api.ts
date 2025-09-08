import useSWR, { type Fetcher } from "swr";
import { authHeader } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

/** Types mirrored from backend schemas */
export type BoardLine = {
  line_id: string;
  player: string;
  team?: string | null;
  stat: "kills_match";
  line_value: number;
  status: "OPEN" | "FROZEN" | "PULLED" | "SETTLED";
};
export type BoardMatch = {
  match_id: string;
  starts_at: string;
  event: string;
  format: string;
  team1?: string | null;
  team2?: string | null;
  lines: BoardLine[];
};
export type BoardResponse = { matches: BoardMatch[] };

type BoardOpts = { refreshInterval?: number; revalidateOnFocus?: boolean; };
export function useBoard(dateISO?: string, opts: BoardOpts = {}) {
  const key = `${API}/board${dateISO ? `?date=${dateISO}` : ""}`;
  const { data, error, isLoading, mutate } = useSWR<BoardResponse>(key, (u)=>jsonFetch<BoardResponse>(u), {
    refreshInterval: opts.refreshInterval ?? 15000,
    revalidateOnFocus: opts.revalidateOnFocus ?? false,
  });
  return { board: data, error, isLoading, refresh: mutate };
}

export type LegIn = { line_id: string; side: "MORE" | "LESS" };
export type EntryCreate = { stake: number; payout_rule: "2LEG_3X" | "3LEG_5X"; legs: LegIn[]; };
export type EntryOut = { entry_id: string; status: string; new_credits: number; };
export async function createEntry(body: EntryCreate) {
  const headers: HeadersInit = { "Content-Type": "application/json", ...authHeader() };
  return jsonFetch<EntryOut>(`${API}/entries`, { method: "POST", headers, body: JSON.stringify(body) });
}

export type Me = { id: string; username: string; credits: number; };
export async function getMe(): Promise<Me> {
  const headers: HeadersInit = { ...authHeader() };
  return jsonFetch<Me>(`${API}/me`, { headers });
}

export async function signup(username: string, password: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  return jsonFetch<Me>(`${API}/signup`, { method: "POST", headers, body: JSON.stringify({ username, password }) });
}

export async function adminRun(path: string, adminToken: string) {
  const headers: HeadersInit = { "X-Admin-Token": adminToken };
  return jsonFetch<{ok: boolean}>(`${API}/admin/run/${path}`, { headers });
}

/** Entries history */
export type EntryLegOut = {
  line_id: string;
  player?: string | null;
  team?: string | null;
  stat: string;
    side: "MORE" | "LESS";
  line_value: number;
    result?: "MORE" | "LESS" | "VOID";
  player_final?: number | null;
};
export type EntryListItem = {
  entry_id: string;
  created_at: string;
  settled_at?: string | null;
  status: "OPEN" | "WON" | "LOST" | "CANCELLED";
  stake: number;
  payout_rule: "2LEG_3X" | "3LEG_5X";
  legs: EntryLegOut[];
};
export type EntriesResponse = { entries: EntryListItem[] };

export function useEntries() {
  const headers: HeadersInit = { ...authHeader() };
  const key = [`${API}/entries`, headers] as [string, HeadersInit];
  const fetcher: Fetcher<EntriesResponse, [string, HeadersInit]> = ([u, h]) => jsonFetch<EntriesResponse>(u, { headers: h });
  const { data, error, isLoading, mutate } = useSWR<EntriesResponse, any, [string, HeadersInit]>(key, fetcher);
  return { data, error, isLoading, refresh: mutate };
}