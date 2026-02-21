<div align="center">

# KIMI

### ML-Powered Esports Player Props

**[kimiprops.com](https://www.kimiprops.com)** · **[esportsprops.com](https://www.esportsprops.com)** · **[kimi-two.vercel.app](https://kimi-two.vercel.app)**

Pick Over/Under on player stat lines. Build 2-6 leg entries. Win K-Coins.

Play money only — no real currency.

![Next.js](https://img.shields.io/badge/Next.js_14-000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on_Vercel-000?style=flat-square&logo=vercel&logoColor=white)

</div>

---

## What is KIMI?

KIMI is a full-stack esports prop betting platform (play money) for Call of Duty League and Valorant Champions Tour. Users browse ML-generated player stat lines, pick Over or Under, build multi-leg entries, and compete on a global leaderboard.

Think PrizePicks — but for esports, with a custom ML model generating every line.

## Features

**Board** — Browse upcoming CDL and VCT matches. Each player card shows ML-projected stat lines (kills, deaths, damage, assists) with confidence scores. Multiple props per player via expandable card sections.

**Entry Slip** — Select Over or Under on 2-6 props to build an entry. Multipliers scale from 3x (2 legs) to 35x (6 legs). Wager 50-2,000 K-Coins per entry.

**My Lineups** — Track all entries with status filters (Active, Won, Lost). Each entry expands to show individual leg results with visual hit/miss indicators.

**Leaderboard** — Global rankings by K-Coin balance, win rate, and entry volume. Podium display for top 3. Weekly, monthly, and all-time filters.

**ML Engine** — Transparency page showing model accuracy (73.2% on validation), feature importance breakdown, and live player projections with recent performance charts.

**Admin Panel** — Protected dashboard for managing teams, players, matches, and prop lines via API routes.

**Auth** — Clerk-powered sign up/sign in with automatic Supabase user sync. New users start with 10,000 K-Coins.

## Architecture

> See `architecture.png` in the repo root for the full system diagram.

```
┌──────────────────────────────────────────────────────────┐
│  CLIENT                                                   │
│  kimiprops.com / esportsprops.com / kimi-two.vercel.app  │
│  Next.js 14 · TypeScript · Tailwind · shadcn/ui          │
├──────────────────────────────────────────────────────────┤
│  FRONTEND                                                 │
│  11 Pages · 6 API Routes · Custom React Hooks            │
│  Clerk Auth · Team-branded UI · Lucide icons             │
├──────────────────────────────────────────────────────────┤
│  BACKEND                                                  │
│  Supabase (Postgres) — users, teams, matches, entries    │
│  place_entry() RPC — atomic wager + leg insertion        │
│  Clerk webhooks — user.created → Supabase sync           │
├──────────────────────────────────────────────────────────┤
│  ML SERVICE                                               │
│  Python · FastAPI · scikit-learn                          │
│  RandomForest v2.4 · 12,847 training samples             │
│  Features: historical avg, map type, opponent rating,    │
│  recent form, home/away, days since last match           │
├──────────────────────────────────────────────────────────┤
│  DATA                                                     │
│  CDL — 12 teams, 48 players, match schedules             │
│  VCT — Americas teams, player stats                      │
│  Training — player_stats.csv (kill/death/damage/assists) │
└──────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Styling | Manrope + Space Mono fonts, Lucide React icons, team-branded color system |
| Auth | Clerk (sign up/in, session management, webhooks) |
| Database | Supabase (PostgreSQL), Prisma ORM |
| ML | Python, FastAPI, scikit-learn (RandomForest) |
| Deployment | Vercel (frontend), Supabase (hosted DB) |
| Monorepo | pnpm workspaces |

## Project Structure

```
Kimi/
├── packages/
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── pages/          # 11 routes (board, lineups, leaderboard, engine, admin, etc.)
│       │   ├── components/     # PlayerCard, BetSlipV2, Nav, EntryCard, KimiLogo, etc.
│       │   ├── hooks/          # useProfile, useMyEntries, usePropLines, usePlaceEntry
│       │   ├── styles/         # globals.css (design tokens, component styles)
│       │   └── lib/            # Supabase client, utilities
│       └── public/             # Favicon, OG images
├── ml/                         # Python ML service
│   ├── model/                  # Trained RandomForest model
│   ├── train.py                # Training pipeline
│   └── api.py                  # FastAPI prediction endpoints
├── prisma/                     # Database schema
└── supabase/                   # Migrations, RPC functions
```

## Design System

- **Background**: `#080a0f` (deep black) with layered card surfaces
- **Accent**: `#00e5a0` (emerald green) — primary actions, OVER picks, success states
- **Red**: `#ff5c5c` — UNDER picks, losses
- **Gold**: `#f5c542` — K-Coin values, payouts
- **Team colors**: Each CDL/VCT team has a branded color applied to card accent bars, avatars, and selection states
- **Typography**: Manrope (UI) + Space Mono (stats/numbers)
- **Icons**: Lucide React — zero emojis

## ML Model

The prediction engine uses a RandomForest classifier trained on 12,847 historical match records.

**Features**: Historical kill average (last 10 matches), map type, opponent strength rating, recent form (last 3), home/away indicator, days since last match.

**Performance**: 73.2% accuracy on validation set, ±4.3 average kills deviation.

**Output**: For each player in an upcoming match, the model produces a projected stat line and confidence score (displayed on player cards).

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 8+
- Python 3.10+ (for ML service)

### Setup

```bash
# Clone
git clone https://github.com/JonathanDunkleberger/Kimi.git
cd Kimi

# Install dependencies
pnpm install

# Set up environment variables
cp packages/web/.env.example packages/web/.env.local
# Fill in: Clerk keys, Supabase URL/keys

# Run development server
pnpm dev
```

### Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Live Demo

- **Primary**: [kimiprops.com](https://www.kimiprops.com)
- **Alternate**: [esportsprops.com](https://www.esportsprops.com)
- **Vercel**: [kimi-two.vercel.app](https://kimi-two.vercel.app)

All three domains serve the same application.

## License

This project is for portfolio and educational purposes only. Not affiliated with the Call of Duty League, Activision, Riot Games, or any esports organization.