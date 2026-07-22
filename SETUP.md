# Esports Props — Inklings Club build

Fantasy-forward DFS props for **Valorant** + **Call of Duty**. Play-money Crowns only.

## Quick start (demo slate, no DB required)

```bash
cd valorant-props
pnpm install
pnpm dev:api    # :4000 — ships with VAL Bo3 + CoD Bo5 demo props
pnpm dev:web    # :3000 — The Lists / Quests / Chronicle / Hall
```

Open http://localhost:3000 — guest wallet starts at **100,000 Crowns**.

## Map / series logic

- **Series props** lock when the match goes live (or at `lockAt`).
- **Map 1** open until that map starts.
- **Map N** unlocks only after map N−1 completes — and only if the series still needs it (Bo3 can end 2–0; Bo5 needs 3 wins).
- Live demo match shows Map 3 as *Unlocks after Map 2*.

## Live DB (optional)

```env
USE_DEMO=0
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
CLERK_SECRET_KEY=...
ADMIN_TOKEN=...
PANDA_SCORE_TOKEN=...
```

```bash
pnpm prisma:generate
pnpm prisma:push
python packages/api/ml/odds_setter.py --limit-matches 30
```

## Multipliers (FE = API)

2→3x · 3→5x · 4→10x · 5→20x · 6→25x
