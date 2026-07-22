import {
  DEMO_PLAYERS,
  DEMO_MATCHES,
  DEMO_LEADERBOARD,
  buildDemoProjections,
  buildDemoStats,
} from "./slate";
import { availabilityLabel, isProjectionAvailable } from "./availability";
import { getMultiplier, MIN_PICKS, MAX_PICKS, STARTING_BALANCE } from "./multipliers";
import liveStats from "./live_stats.json";

type MemEntry = {
  id: string;
  userId: string;
  wager: number;
  payout: number;
  status: string;
  isWin: boolean | null;
  lockedAt: string;
  createdAt: string;
  picks: any[];
};

const g = globalThis as typeof globalThis & {
  __espBalances?: Map<string, number>;
  __espEntries?: Map<string, MemEntry[]>;
};

function balances() {
  if (!g.__espBalances) g.__espBalances = new Map();
  return g.__espBalances;
}
function entries() {
  if (!g.__espEntries) g.__espEntries = new Map();
  return g.__espEntries;
}

function ensureUser(userId: string) {
  if (!balances().has(userId)) balances().set(userId, STARTING_BALANCE);
  if (!entries().has(userId)) entries().set(userId, []);
}

function playerById(id: string) {
  return DEMO_PLAYERS.find((p) => p.id === id)!;
}
function matchById(id: string) {
  return DEMO_MATCHES.find((m) => m.id === id)!;
}

function hydrateProjection(p: ReturnType<typeof buildDemoProjections>[number]) {
  const player = playerById(p.playerId);
  const match = matchById(p.matchId);
  const matchLike = {
    ...match,
    scheduledAt: new Date(match.scheduledAt),
    lockAt: new Date(match.lockAt),
  };
  const available = isProjectionAvailable(matchLike, p);
  return {
    id: p.id,
    statType: p.statType,
    value: p.value,
    scope: p.scope,
    mapNumber: p.mapNumber,
    sigma: p.sigma,
    isOpen: available,
    availability: availabilityLabel(matchLike, p),
    player: {
      id: player.id,
      name: player.name,
      team: player.team,
      imageUrl: player.imageUrl,
      game: player.game,
      role: player.role,
    },
    match: {
      id: match.id,
      game: match.game,
      format: match.format,
      scheduledAt: match.scheduledAt,
      status: match.status,
      lockAt: match.lockAt,
      event: match.event,
      teamA: match.teamA,
      teamB: match.teamB,
      mapsCompleted: match.mapsCompleted,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      maps: match.maps,
    },
  };
}

const GUEST = "guest_user_123";

export function handleDemoApi(
  method: string,
  path: string,
  query: Record<string, string | string[] | undefined>,
  body: any,
  authHeader?: string | string[]
): { status: number; json: any } {
  const userId = GUEST;
  ensureUser(userId);

  if (path === "health" && method === "GET") {
    return {
      status: 200,
      json: {
        ok: true,
        service: "esports-props-api",
        mode: "demo",
        via: "vercel",
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (path === "projections" && method === "GET") {
    return { status: 200, json: buildDemoProjections().map(hydrateProjection) };
  }

  if (path === "stats" && method === "GET") {
    const game = String(query.game || "ALL").toUpperCase();
    const livePlayers = Array.isArray((liveStats as any)?.players)
      ? (liveStats as any).players
      : [];
    let players = livePlayers.length ? livePlayers : buildDemoStats();
    if (game === "VALORANT" || game === "COD") {
      players = players.filter((p: { game: string }) => p.game === game);
    }
    players = [...players].sort(
      (a: { rating: number }, b: { rating: number }) => b.rating - a.rating
    );
    return {
      status: 200,
      json: {
        game,
        players,
        updatedAt: (liveStats as any)?.updatedAt ?? null,
        sources: (liveStats as any)?.sources ?? ["demo"],
      },
    };
  }

  if (path === "leaderboard" && method === "GET") {
    return { status: 200, json: { period: "7d", rows: DEMO_LEADERBOARD } };
  }

  if (path === "multipliers" && method === "GET") {
    return {
      status: 200,
      json: { multipliers: { 2: 3, 3: 5, 4: 10, 5: 20, 6: 25 }, minPicks: MIN_PICKS, maxPicks: MAX_PICKS },
    };
  }

  if (path === "me" && method === "GET") {
    return {
      status: 200,
      json: {
        id: userId,
        email: "guest@esportsprops.com",
        username: "Guest",
        balance: balances().get(userId),
        createdAt: new Date().toISOString(),
        isGuest: true,
      },
    };
  }

  if (path === "entries" && method === "GET") {
    return { status: 200, json: entries().get(userId) || [] };
  }

  if (path === "entries" && method === "POST") {
    const wager = Number(body?.wager);
    const picks = Array.isArray(body?.picks) ? body.picks : [];
    if (!wager || wager <= 0) return { status: 400, json: { error: "Invalid wager" } };
    if (picks.length < MIN_PICKS || picks.length > MAX_PICKS) {
      return { status: 400, json: { error: `Pick ${MIN_PICKS}–${MAX_PICKS} legs` } };
    }
    const bal = balances().get(userId) || 0;
    if (wager > bal) return { status: 400, json: { error: "Insufficient Credits" } };

    const projections = buildDemoProjections().map(hydrateProjection);
    const byId = new Map(projections.map((p) => [p.id, p]));
    const resolved = [];
    for (const pk of picks) {
      const proj = byId.get(pk.playerProjectionId);
      if (!proj || !proj.isOpen) {
        return { status: 400, json: { error: "One or more props are locked" } };
      }
      resolved.push({
        id: `pick_${Math.random().toString(36).slice(2, 10)}`,
        playerProjectionId: proj.id,
        pickType: pk.pickType,
        lineAtLock: proj.value,
        isWin: null,
        result: null,
        playerProjection: proj,
      });
    }

    const mult = getMultiplier(resolved.length);
    const payout = wager * mult;
    balances().set(userId, bal - wager);
    const entry: MemEntry = {
      id: `entry_${Math.random().toString(36).slice(2, 10)}`,
      userId,
      wager,
      payout,
      status: "LOCKED",
      isWin: null,
      lockedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      picks: resolved,
    };
    entries().get(userId)!.unshift(entry);
    return { status: 200, json: entry };
  }

  return { status: 404, json: { error: `Demo route not found: ${method} /${path}` } };
}
