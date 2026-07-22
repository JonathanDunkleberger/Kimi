import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { resolveAuth } from './lib/auth';
import { getMultiplier, MIN_PICKS, MAX_PICKS, STARTING_BALANCE } from './lib/multipliers';
import { availabilityLabel, isProjectionAvailable } from './lib/availability';
import {
  DEMO_PLAYERS,
  DEMO_MATCHES,
  DEMO_LEADERBOARD,
  buildDemoProjections,
  buildDemoStats,
} from './demo/slate';

/**
 * Demo mode is the default for local/side-project velocity.
 * Set USE_DEMO=0 and DATABASE_URL to use Prisma/live DB.
 */
const USE_DEMO = process.env.USE_DEMO !== '0' || !process.env.DATABASE_URL;

type PrismaLike = {
  user: any;
  entry: any;
  pick: any;
  playerProjection: any;
  ledgerEntry: any;
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
};

let prisma: PrismaLike | null = null;

async function initPrisma() {
  if (USE_DEMO) return;
  try {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient() as unknown as PrismaLike;
    console.log('[api] Prisma connected');
  } catch (e) {
    console.warn('[api] Prisma unavailable — staying on demo slate', e);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

try {
  const { clerkMiddleware } = await import('@clerk/express');
  app.use(clerkMiddleware());
} catch {
  console.warn('[api] Clerk middleware skipped');
}

type MemEntry = {
  id: string;
  userId: string;
  wager: number;
  payout: number;
  status: 'LOCKED' | 'LIVE' | 'SETTLED' | 'VOID';
  isWin: boolean | null;
  lockedAt: string;
  createdAt: string;
  picks: {
    id: string;
    playerProjectionId: string;
    pickType: string;
    lineAtLock: number;
    isWin: boolean | null;
    result: number | null;
    playerProjection: ReturnType<typeof hydrateProjection>;
  }[];
};

const memBalances = new Map<string, number>();
const memEntries = new Map<string, MemEntry[]>();

function ensureMemUser(userId: string) {
  if (!memBalances.has(userId)) memBalances.set(userId, STARTING_BALANCE);
  if (!memEntries.has(userId)) memEntries.set(userId, []);
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

function demoProjectionsPayload() {
  return buildDemoProjections().map(hydrateProjection);
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'esports-props-api',
    mode: !prisma ? 'demo' : 'live',
    timestamp: new Date().toISOString(),
  });
});

app.get('/projections', async (_req, res) => {
  try {
    if (!prisma) return res.json(demoProjectionsPayload());
    const rows = await prisma.playerProjection.findMany({
      include: { player: true, match: { include: { maps: true } } },
    });
    if (!rows.length) return res.json(demoProjectionsPayload());

    const payload = rows.map((r: any) => {
      const matchLike = {
        game: r.match.game,
        format: r.match.format,
        status: r.match.status,
        lockAt: r.match.lockAt,
        scheduledAt: r.match.scheduledAt,
        scoreA: r.match.scoreA,
        scoreB: r.match.scoreB,
        mapsCompleted: r.match.mapsCompleted,
        maps: r.match.maps,
      };
      const projLike = { scope: r.scope, mapNumber: r.mapNumber, isOpen: r.isOpen };
      const available = isProjectionAvailable(matchLike, projLike);
      return {
        id: r.id,
        statType: r.statType,
        value: r.value,
        scope: r.scope,
        mapNumber: r.mapNumber,
        sigma: r.sigma,
        isOpen: available,
        availability: availabilityLabel(matchLike, projLike),
        player: r.player,
        match: {
          id: r.match.id,
          game: r.match.game,
          format: r.match.format,
          scheduledAt: r.match.scheduledAt,
          status: r.match.status,
          lockAt: r.match.lockAt,
          event: r.match.event,
          teamA: r.match.teamA,
          teamB: r.match.teamB,
          mapsCompleted: r.match.mapsCompleted,
          scoreA: r.match.scoreA,
          scoreB: r.match.scoreB,
          maps: r.match.maps,
        },
      };
    });
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.json(demoProjectionsPayload());
  }
});

app.get('/stats', async (req, res) => {
  const game = String(req.query.game || 'ALL').toUpperCase();
  let rows = buildDemoStats();
  if (game === 'VALORANT' || game === 'COD') rows = rows.filter((r) => r.game === game);
  rows.sort((a, b) => b.rating - a.rating);
  res.json({ game, players: rows });
});

app.get('/leaderboard', async (_req, res) => {
  res.json({ period: '7d', rows: DEMO_LEADERBOARD });
});

app.get('/multipliers', (_req, res) => {
  res.json({
    minPicks: MIN_PICKS,
    maxPicks: MAX_PICKS,
    table: { 2: 3, 3: 5, 4: 10, 5: 20, 6: 25 },
  });
});

async function ensureUser(userId: string, email?: string | null) {
  ensureMemUser(userId);
  if (!prisma) return;
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: email || `${userId}@esportsprops.com`,
      balance: STARTING_BALANCE,
      username: userId.startsWith('guest') ? 'Club Guest' : undefined,
    },
  });
}

app.post('/entries', async (req, res) => {
  const auth = resolveAuth(req);
  await ensureUser(auth.userId, auth.email);
  const { wager, picks } = req.body as {
    wager: number;
    picks: { playerProjectionId: string; pickType: string }[];
  };

  if (!wager || wager <= 0 || !Array.isArray(picks)) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  if (picks.length < MIN_PICKS || picks.length > MAX_PICKS) {
    return res.status(400).json({ error: `Pick between ${MIN_PICKS} and ${MAX_PICKS} legs` });
  }

  const multiplier = getMultiplier(picks.length);
  if (!multiplier) return res.status(400).json({ error: 'Invalid pick count' });

  const allProj = demoProjectionsPayload();
  for (const pk of picks) {
    const proj = allProj.find((p) => p.id === pk.playerProjectionId);
    if (!proj) return res.status(400).json({ error: `Unknown projection ${pk.playerProjectionId}` });
    if (!proj.isOpen) {
      return res.status(400).json({
        error: `${proj.player.name} ${proj.statType} is locked (${proj.availability})`,
      });
    }
    if (pk.pickType !== 'MORE' && pk.pickType !== 'LESS') {
      return res.status(400).json({ error: 'pickType must be MORE or LESS' });
    }
  }

  try {
    if (!prisma) {
      const bal = memBalances.get(auth.userId)!;
      if (bal < wager) return res.status(400).json({ error: 'Insufficient Crowns' });
      memBalances.set(auth.userId, bal - wager);
      const entry: MemEntry = {
        id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: auth.userId,
        wager,
        payout: wager * multiplier,
        status: 'LOCKED',
        isWin: null,
        lockedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        picks: picks.map((pk, i) => {
          const proj = allProj.find((p) => p.id === pk.playerProjectionId)!;
          return {
            id: `pick_${i}_${proj.id}`,
            playerProjectionId: pk.playerProjectionId,
            pickType: pk.pickType,
            lineAtLock: proj.value,
            isWin: null,
            result: null,
            playerProjection: proj,
          };
        }),
      };
      memEntries.get(auth.userId)!.unshift(entry);
      return res.json(entry);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.findUnique({ where: { id: auth.userId } });
      if (!user || user.balance < wager) throw new Error('Insufficient Crowns');

      const entry = await tx.entry.create({
        data: {
          userId: auth.userId,
          wager,
          payout: wager * multiplier,
          status: 'LOCKED',
          picks: {
            create: picks.map((p) => {
              const proj = allProj.find((x) => x.id === p.playerProjectionId);
              return {
                playerProjectionId: p.playerProjectionId,
                pickType: p.pickType,
                lineAtLock: proj?.value ?? 0,
              };
            }),
          },
        },
        include: {
          picks: { include: { playerProjection: { include: { player: true, match: true } } } },
        },
      });

      await tx.user.update({
        where: { id: auth.userId },
        data: { balance: { decrement: wager } },
      });

      await tx.ledgerEntry.create({
        data: {
          userId: auth.userId,
          delta: -wager,
          balance: user.balance - wager,
          reason: 'ENTRY_WAGER',
          refId: entry.id,
        },
      });

      return entry;
    });
    res.json(result);
  } catch (e: any) {
    if (e.message === 'Insufficient Crowns') {
      return res.status(400).json({ error: 'Insufficient Crowns' });
    }
    console.error(e);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

app.get('/entries', async (req, res) => {
  const auth = resolveAuth(req);
  await ensureUser(auth.userId, auth.email);
  try {
    if (!prisma) return res.json(memEntries.get(auth.userId) || []);
    const entries = await prisma.entry.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        picks: { include: { playerProjection: { include: { player: true, match: true } } } },
      },
    });
    res.json(entries);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list entries' });
  }
});

app.get('/me', async (req, res) => {
  const auth = resolveAuth(req);
  await ensureUser(auth.userId, auth.email);
  try {
    if (!prisma) {
      return res.json({
        id: auth.userId,
        email: auth.email,
        username: auth.isGuest ? 'Wanderer' : null,
        balance: memBalances.get(auth.userId) ?? STARTING_BALANCE,
        createdAt: new Date().toISOString(),
        isGuest: auth.isGuest,
      });
    }
    const appUser = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!appUser) return res.status(404).json({ error: 'User not found' });
    res.json({ ...appUser, isGuest: auth.isGuest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

app.post('/settlements', async (req, res) => {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!prisma) return res.status(400).json({ error: 'Settlement requires live DB mode' });

  const { results } = req.body as { results: { pickId: string; actual: number }[] };
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'No results provided' });
  }

  try {
    const pickIds = results.map((r) => r.pickId);
    const picks = await prisma.pick.findMany({
      where: { id: { in: pickIds } },
      include: { entry: true, playerProjection: true },
    });
    const pickMap = new Map(results.map((r) => [r.pickId, r.actual]));
    let updatedPicks = 0;
    let updatedEntries = 0;
    const entryIdsToCheck = new Set<string>();

    for (const p of picks) {
      const actual = pickMap.get(p.id);
      if (actual === undefined || (p.isWin !== null && p.isWin !== undefined)) continue;
      const line = p.lineAtLock ?? p.playerProjection.value;
      let isWin: boolean | null = null;
      if (p.pickType === 'MORE') isWin = actual > line;
      else if (p.pickType === 'LESS') isWin = actual < line;
      await prisma.pick.update({ where: { id: p.id }, data: { result: actual, isWin } });
      updatedPicks++;
      entryIdsToCheck.add(p.entryId);
    }

    for (const entryId of entryIdsToCheck) {
      const entry = await prisma.entry.findUnique({
        where: { id: entryId },
        include: { picks: true },
      });
      if (!entry) continue;
      const unsettled = entry.picks.some((pk: any) => pk.isWin === null || pk.isWin === undefined);
      if (unsettled) continue;
      const allWin = entry.picks.every((pk: any) => pk.isWin === true);
      if (entry.isWin === null || entry.isWin === undefined) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { isWin: allWin, status: 'SETTLED', settledAt: new Date() },
        });
        if (allWin) {
          const user = await prisma.user.update({
            where: { id: entry.userId },
            data: { balance: { increment: entry.payout } },
          });
          await prisma.ledgerEntry.create({
            data: {
              userId: entry.userId,
              delta: entry.payout,
              balance: user.balance,
              reason: 'ENTRY_PAYOUT',
              refId: entry.id,
            },
          });
        }
        updatedEntries++;
      }
    }

    res.json({ ok: true, updatedPicks, updatedEntries });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Settlement failed' });
  }
});

app.get('/admin/unsettled-picks', async (req, res) => {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!prisma) return res.json({ count: 0, picks: [] });
  try {
    const picks = await prisma.pick.findMany({
      where: { isWin: null },
      include: { playerProjection: { include: { player: true } }, entry: true },
      orderBy: { id: 'asc' },
    });
    const data = picks.map((p: any) => ({
      pickId: p.id,
      entryId: p.entryId,
      userId: p.entry.userId,
      pickType: p.pickType,
      projectionValue: p.lineAtLock ?? p.playerProjection.value,
      statType: p.playerProjection.statType,
      player: p.playerProjection.player.name,
      team: p.playerProjection.player.team,
      createdAt: p.entry.createdAt,
    }));
    res.json({ count: data.length, picks: data });
  } catch {
    res.status(500).json({ error: 'Failed to load unsettled picks' });
  }
});

const port = process.env.PORT || 4000;

await initPrisma();
app.listen(port, () => {
  console.log(`Esports Props API on :${port} (${prisma ? 'live DB' : 'DEMO slate'})`);
});
