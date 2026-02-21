# 🎯 Kimi — Valorant & CoD Esports Fantasy Props

![Kimi](packages/web/Public/kimi-screenshot.png)

A full-stack fantasy esports platform where users bet play-money on player performance props (kills, damage, assists) powered by machine learning predictions.

Think PrizePicks, but for Valorant and Call of Duty — with an ML engine that generates the lines.

🔗 **Live**: [kimi-two.vercel.app](https://kimi-two.vercel.app)

## What Makes This Interesting

1. **ML-Powered Lines**: A RandomForest model (Valorant) and GradientBoosting model (CoD) trained on thousands of historical match stats generate every prop line. Each line includes a confidence score and directional signal.

2. **Real-Time Data Pipeline**: PandaScore API provides upcoming matches, enriches with rosters, generates predictions, and publishes map-scoped prop lines — all automated via cron jobs.

3. **Full Betting Engine**: Atomic credit deduction, parlay multipliers (2–6 legs), automatic settlement with per-map stat resolution, void/cancellation handling, 15-minute lock window.

4. **Security-First**: RLS on every table, all mutations through SECURITY DEFINER RPCs, rate limiting, zero PII exposure on public pages.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Vercel      │     │    Supabase       │     │  PandaScore  │
│  (Next.js)    │────▶│  Postgres + Auth  │◀────│     API      │
│  Frontend     │     │  RLS policies     │     │  (VCT + CDL) │
└──────────────┘     └──────────────────┘     └──────────────┘
                                                      ▲
                                               ┌──────┴───────┐
                                               │ GitHub Actions│
                                               │ Weekly Cron   │
                                               └──────────────┘
```

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, Zustand | UI, auth, bet slip |
| Database | Supabase (Postgres + RLS) | Teams, players, matches, prop lines, entries |
| Auth | Supabase Auth | Sign up/in, profiles, balances |
| Data Pipeline | Python + PandaScore API | Sync VCT + CDL matches, rosters, prop lines |
| ML | RandomForest (Val), GradientBoosting (CoD) | Kill predictions, confidence scoring |
| Hosting | Vercel | Frontend deployment |
| Automation | GitHub Actions | Weekly match sync cron |

## Features

- **Dual-game support** — Valorant (VCT) and Call of Duty (CDL) with tab switching
- **Real match data** — Upcoming and live matches from PandaScore, filtered to professional leagues
- **Map-scoped prop lines** — Kills, assists, deaths, damage scoped to guaranteed maps only (no ambiguous totals)
- **ML confidence indicators** — Each prop line shows model confidence (%) and directional signal
- **Parlay entries** — Build 2–6 leg over/under entries with multipliers up to 35x
- **Lock window** — Props lock 15 minutes before match start
- **User accounts** — Sign up, track balance, view entry history, win/loss streaks
- **Leaderboard** — Top users by profit with podium display
- **ML Engine page** — Tabbed model comparison for Valorant/CoD with feature lists and metrics
- **Daily refill** — Users below 500 K-Coins get topped up to 1,000 daily

## 🔐 Security

- All database mutations run through PostgreSQL RPC functions with `SECURITY DEFINER`
- Row Level Security (RLS) on every table — users can only access their own entries
- Service role key is backend-only, never exposed to the client
- Balance modifications only possible through validated server-side functions
- Rate limiting on entry placement (5 per minute)
- No PII exposed on public-facing pages (leaderboard shows usernames, not emails)
- Input validation on all RPC parameters (positive amounts, valid prop line status, leg count limits, wager caps)
- Lock window prevents entries on matches starting within 15 minutes

## Payout Structure

| Legs | Multiplier | Description |
|------|-----------|-------------|
| 2 | 3x | Low risk |
| 3 | 5x | Sweet spot |
| 4 | 10x | Big swing |
| 5 | 20x | High risk |
| 6 | 35x | Lottery ticket |

- **All legs must hit to win.** Push (actual = line) counts as a win.
- **Min wager**: 50 K-Coins / **Max wager**: 2,000 K-Coins
- **Starting balance**: 10,000 K-Coins

## Project Structure

```
packages/web/           Next.js frontend (deployed to Vercel)
  src/pages/              Pages (board, entries, profile, account, admin, leaderboard, ml)
  src/components/         UI components (MatchSection, PlayerCard, BetSlipV2, Layout, etc.)
  src/hooks/              Data hooks (useMatches, usePropLines, useLeaderboard)
  src/stores/             Zustand stores (authStore, slipStore, toastStore)
  src/actions/            Entry placement logic
  src/lib/                Supabase client, utils
  src/types/              TypeScript types

ml/                     Python data pipeline
  sync_matches.py         Weekly sync — VCT + CDL matches, rosters, map-scoped prop lines
  settle_matches.py       Settle completed matches via PandaScore per-map results

supabase/migrations/    Database schema & RPC functions
  000_full_setup.sql      Core schema, RLS, seed data
  009_scoped_prop_types.sql  Map-scoped prop types
  010_payout_security.sql    Hardened RPCs, rate limiting, void handling
```

## Getting Started

### Prerequisites

- Node.js 20+, pnpm 9+
- Python 3.11+
- Supabase project ([supabase.com](https://supabase.com))
- PandaScore API token ([pandascore.co](https://pandascore.co))

### Setup

```bash
git clone https://github.com/JonathanDunkleberger/Kimi.git
cd Kimi && pnpm install

# Supabase: run migrations in order via SQL Editor
# Configure .env files (see SETUP.md)

pip install requests python-dotenv supabase
python ml/sync_matches.py    # Sync this week's matches

cd packages/web && pnpm dev  # http://localhost:3000
```

## Deployment

**Frontend** → Vercel (from `packages/web`)
**Weekly sync** → GitHub Actions (every Monday 6am UTC)

Environment variables needed:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
- `SUPABASE_SERVICE_ROLE_KEY` / `PANDA_SCORE_TOKEN` (backend/CI only)

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

This platform uses play money only. Not affiliated with Riot Games, Activision, or any esports league. For entertainment and portfolio demonstration purposes.
