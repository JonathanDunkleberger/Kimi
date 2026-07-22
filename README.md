# Esports Props

**Inklings Club · Valorant & Call of Duty**

PrizePicks-style play-money props with proprietary (and demo) line setting, a Tolkien / Anglo-Saxon club atmosphere, and map-gated series logic.

Live: [esportsprops.com](https://www.esportsprops.com)

## Run (demo — no DB)

```bash
cd valorant-props
pnpm install
pnpm dev:api   # :4000
pnpm dev:web   # :3000
```

Guest wallet: **100,000 Crowns**. Open http://localhost:3000

## Product surface

| Route | Name | Purpose |
|-------|------|---------|
| `/` | The Lists | Prop board (VAL + CoD, series + per-map) |
| `/entries` | Quests | Live / past slips |
| `/stats` | Chronicle | Player leaderboard (VLR/BP-lite) |
| `/leaderboard` | Hall | Crown profit ranks |
| `/account` | Account | Balance / guest note |

## Series / map rules

- Series props lock at match live / `lockAt`
- Map 1 open until that map starts
- Map N unlocks only after map N−1 completes **and** the series still needs it (Bo3 can 2–0; Bo5 needs 3 wins)

## Stack

Next.js 14 · Express · Prisma schema (optional live DB) · Python ML crons

See `SETUP.md` for live DB + PandaScore.
