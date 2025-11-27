import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, Pick as PickModel } from '@prisma/client';
import { clerkClient, clerkMiddleware, requireAuth, getAuth } from '@clerk/express';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'api', timestamp: new Date().toISOString() });
});

// Placeholder projections endpoint
app.get('/projections', async (_req: Request, res: Response) => {
  try {
    const projections = await prisma.playerProjection.findMany({
      include: { 
        player: true,
        match: true
      }
    });
    res.json(projections);
  } catch (e:any) {
    res.status(500).json({ error: 'Failed to fetch projections' });
  }
});

// Ensure an application user record exists for the Clerk user
async function ensureUser(id: string, email?: string | null) {
  await prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: email || `${id}@placeholder.local`, balance: 1000000 }
  });
}

// Create entry with picks
app.post('/entries', async (req: Request, res: Response) => {
  // Mock auth for guest mode
  const userId = 'guest_user_123';
  
  // fetch Clerk user for email (optional)
  let email: string | undefined = 'guest@example.com';
  
  await ensureUser(userId, email);
  const { wager, picks } = req.body as { wager: number; picks: { playerProjectionId: string; pickType: string }[] };
  if (!wager || !Array.isArray(picks) || picks.length === 0) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  // Basic multiplier: 2 picks -> 3x, 3 picks -> 5x, else linear 1x * count
  let multiplier = 1;
  if (picks.length === 2) multiplier = 3; else if (picks.length === 3) multiplier = 5; else multiplier = picks.length;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.balance < wager) {
        throw new Error('Insufficient balance');
      }

      const entry = await tx.entry.create({
        data: {
          userId,
          wager,
          payout: wager * multiplier,
          picks: { create: picks.map(p => ({ playerProjectionId: p.playerProjectionId, pickType: p.pickType })) }
        },
        include: { picks: { include: { playerProjection: { include: { player: true } } } } }
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: wager } }
      });

      return entry;
    });
    res.json(result);
  } catch (e:any) {
    if (e.message === 'Insufficient balance') {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// List entries for current user
app.get('/entries', async (req: Request, res: Response) => {
  const userId = 'guest_user_123';
  await ensureUser(userId);
  try {
    const entries = await prisma.entry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        picks: { include: { playerProjection: { include: { player: true } } } }
      }
    });
    res.json(entries);
  } catch (e:any) {
    res.status(500).json({ error: 'Failed to list entries' });
  }
});

// Current user summary
app.get('/me', async (req: Request, res: Response) => {
  const userId = 'guest_user_123';
  try {
    const email = 'guest@example.com';
    await ensureUser(userId, email);
    const appUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!appUser) return res.status(404).json({ error: 'User not found' });
    res.json({ id: appUser.id, email: appUser.email, balance: appUser.balance, createdAt: appUser.createdAt });
  } catch (e:any) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

// Settlement admin endpoint
// Body: { results: { pickId: string; actual: number }[] }
app.post('/settlements', async (req: Request, res: Response) => {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { results } = req.body as { results: { pickId: string; actual: number }[] };
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'No results provided' });
  }
  const pickIds = results.map(r => r.pickId);
  try {
    const picks = await prisma.pick.findMany({
      where: { id: { in: pickIds } },
      include: { entry: true, playerProjection: true }
    });
    const pickMap = new Map(results.map(r => [r.pickId, r.actual]));
    let updatedPicks = 0;
    let updatedEntries = 0;
    const entryIdsToCheck = new Set<string>();

    for (const p of picks) {
      const actual = pickMap.get(p.id);
      if (actual === undefined || p.isWin !== null && p.isWin !== undefined) continue; // skip already settled
      let isWin: boolean | null = null;
      if (p.pickType === 'MORE') isWin = actual > p.playerProjection.value;
      else if (p.pickType === 'LESS') isWin = actual < p.playerProjection.value;
      await prisma.pick.update({ where: { id: p.id }, data: { result: actual, isWin } });
      updatedPicks++;
      entryIdsToCheck.add(p.entryId);
    }

    for (const entryId of entryIdsToCheck) {
      const entry = await prisma.entry.findUnique({
        where: { id: entryId },
        include: { picks: true }
      });
      if (!entry) continue;
  const unsettled = entry.picks.some((pk: PickModel) => pk.isWin === null || pk.isWin === undefined);
      if (unsettled) continue;
      // All settled
  const allWin = entry.picks.every((pk: PickModel) => pk.isWin === true);
      if (entry.isWin === null || entry.isWin === undefined) {
        await prisma.entry.update({ where: { id: entry.id }, data: { isWin: allWin } });
        if (allWin) {
          await prisma.user.update({ where: { id: entry.userId }, data: { balance: { increment: entry.payout } } });
        }
        updatedEntries++;
      }
    }

    res.json({ ok: true, updatedPicks, updatedEntries });
  } catch (e:any) {
    res.status(500).json({ error: 'Settlement failed' });
  }
});

// Admin: list unsettled picks
app.get('/admin/unsettled-picks', async (req: Request, res: Response) => {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const picks = await prisma.pick.findMany({
      where: { isWin: null },
      include: { playerProjection: { include: { player: true } }, entry: true },
      orderBy: { id: 'asc' }
    });
  const data = picks.map((p: any) => ({
      pickId: p.id,
      entryId: p.entryId,
      userId: p.entry.userId,
      pickType: p.pickType,
      projectionValue: p.playerProjection.value,
      statType: p.playerProjection.statType,
      player: p.playerProjection.player.name,
      team: p.playerProjection.player.team,
      createdAt: p.entry.createdAt
    }));
    res.json({ count: data.length, picks: data });
  } catch (e:any) {
    res.status(500).json({ error: 'Failed to load unsettled picks' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});
