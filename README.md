# Kimi# 🎯 Valorant Props Platform



Esports fantasy props platform for **Valorant (VCT)** and **Call of Duty (CDL)**. Real match data from PandaScore, player prop lines with ML confidence indicators, and a parlay-style entry system — all running on Supabase + Vercel with zero backend servers.A full-stack experimental platform for generating, publishing, and settling player prop betting lines for professional Valorant esports matches. It ingests upcoming matches, predicts player kill totals with an ML model, allows users to place entries, and settles outcomes automatically using scraped scoreboards.



## Architecture## ✨ Features



```- Automated scraping of upcoming professional matches (VLR.gg) with roster enrichment

┌──────────────┐     ┌──────────────────┐     ┌──────────────┐- Professional event filtering via keyword list (VCT, Masters, Champions, etc.)

│   Vercel      │     │    Supabase       │     │  PandaScore  │- ML-driven prop line generation (RandomForest regression model for Total Kills)

│  (Next.js)    │────▶│  Postgres + Auth  │◀────│     API      │- FastAPI model inference service and integration in scraper

│  Frontend     │     │  RLS policies     │     │  (VCT + CDL) │- Secure credit deduction and prop line settlement via Postgres (Supabase) RPC functions

└──────────────┘     └──────────────────┘     └──────────────┘- Frontend (Next.js + Tailwind + shadcn/ui) for browsing matches, building entries, and viewing profile

                                                      ▲- Scheduled cron jobs (Render) for continuous ingestion and settlement

                                               ┌──────┴───────┐- Direct Supabase REST querying on the frontend (RLS-friendly)

                                               │ GitHub Actions│

                                               │ Weekly Cron   │## 🧰 Tech Stack

                                               └──────────────┘

```Backend:

 

| Layer | Technology | Purpose |- Python, FastAPI, Playwright, Supabase Python client, scikit-learn, pandas

|-------|-----------|---------|Frontend:

| Frontend | Next.js 14, React 18, Tailwind CSS v4, Zustand | UI, auth, bet slip |- Next.js (React + TypeScript), TailwindCSS, shadcn/ui

| Database | Supabase (Postgres) | Teams, players, matches, prop lines, entries, auth |Infrastructure:

| Auth | Supabase Auth | Sign up / sign in, profiles, balances | 

| Data Pipeline | Python + PandaScore API | Sync VCT + CDL matches, rosters, prop lines |- Supabase (Postgres + Auth + Storage), Render (web service + cron jobs)

| Hosting | Vercel | Frontend deployment |ML:

| Automation | GitHub Actions | Weekly match sync cron (Mondays 6am UTC) | 

- RandomForestRegressor model predicting player match kills

## Features

## 🏗️ Architecture Overview

- **Dual-game support** — Valorant (VCT) and Call of Duty (CDL) with tab switching

- **Real match data** — Upcoming and live matches from PandaScore, filtered to professional leagues only1. Scraper fetches upcoming matches, filters to approved events, enriches with rosters, and inserts matches & players.

- **Player prop lines** — Kills, Deaths, Assists (VCT) and Kills, Damage, Map Kills (CDL) with ML confidence2. For each player, model_infer predicts a Total Kills value; a prop line is inserted (prop_lines table).

- **Parlay entries** — Build multi-leg over/under entries from the bet slip3. Users place entries (parlays) selecting Over/Under on prop lines; credits are atomically deducted (deduct_credits function).

- **User accounts** — Sign up, track balance, view entry history, win/loss streaks4. After matches complete, settlement job scrapes final scoreboard, calls settle_prop_line to score lines and payout winners.

- **Admin panel** — Manual match/team/player/prop creation5. Historical data collection + training script allow periodic model retraining; artifact (kill_predictor_model.pkl) versioned in repo.

- **Leaderboard** — Top users by profit

- **ML insights page** — View model confidence and direction indicators## 📂 Repository Layout

- **Auto-updating** — GitHub Actions syncs new matches every Monday

```text

## Project Structurebackend/

  scraper.py          # Match + roster scraping, prop line creation, settlement

```  model_infer.py      # Lazy-loaded model prediction helpers

packages/web/           Next.js frontend (deployed to Vercel)  train_model.py      # Training script for kill predictor

  src/pages/              Pages (index, entries, profile, account, admin, leaderboard, ml)  training_data.py    # Historical data scraper producing player_stats.csv

  src/components/         UI components (MatchCard, BetSlip, Layout, etc.)  model_api/          # FastAPI inference service (predict endpoint)

  src/hooks/              Data hooks (useMatches, usePropLines, useLeaderboard, etc.)  sql/                # Database functions (settle_prop_line, deduct_credits)

  src/stores/             Zustand stores (authStore, slipStore, toastStore)frontend/

  src/lib/                Supabase client, utils  src/pages/          # Next.js pages (index, entries, account/admin etc.)

  src/types/              TypeScript types  src/components/     # UI components (MatchCard, BetSlip ...)

render.yaml           # Render deployment + cron definitions

ml/                     Python data pipelineREADME.md             # (This file)

  sync_matches.py         Weekly sync — VCT + CDL matches, rosters, prop lines```

  settle_matches.py       Settle completed matches via PandaScore results

## 🚀 Getting Started (Local Dev)

supabase/migrations/    Database schema

  000_full_setup.sql      Core schema (teams, players, matches, prop_lines, entries, etc.)### ✅ Prerequisites

  007_pandascore_ids.sql  PandaScore ID columns for data linking

- Python 3.11+

.github/workflows/- Node.js 18+

  weekly-sync.yml         Cron: runs sync_matches.py every Monday- Playwright browsers installed (for scraper)

```- Supabase project (URL + anon + service role keys)



## Getting Started### 🛠 Backend Setup



### Prerequisites```bash

cd backend

- Node.js 20+, pnpm 9+python -m venv .venv

- Python 3.11+source .venv/bin/activate  # Windows: .venv\Scripts\activate

- Supabase project ([supabase.com](https://supabase.com))pip install -r requirements.txt

- PandaScore API token ([pandascore.co](https://pandascore.co)) — free tier worksplaywright install chromium

cp .env.example .env  # populate SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.

### 1. Clone and installpython scraper.py  # one-off run

```

```bash

git clone https://github.com/JonathanDunkleberger/Kimi.gitRun model API service:

cd Kimi

pnpm install```bash

```uvicorn model_api.main:app --reload --port 8001

```

### 2. Set up Supabase

### 💻 Frontend Setup

Run the migrations in order via the Supabase SQL Editor:

```bash

```cd frontend

supabase/migrations/000_full_setup.sqlnpm install

supabase/migrations/007_pandascore_ids.sqlcp .env.local.example .env.local  # ensure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

```npm run dev

```

### 3. Configure environment

Visit <http://localhost:3000> to view upcoming prop lines.

Create `packages/web/.env.local`: 



```env## 🗄️ Supabase Schema & Functions

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-keyKey tables: teams, players, matches, prop_types, prop_lines, entries, entry_legs, users, settlement_events.

```

Functions:

Create `.env` (root, for Python scripts): 

- settle_prop_line(prop_line_id, actual_result) – Scores line, updates legs & entries, credits winners

```env- deduct_credits(p_user_id, p_amount) – Atomic credit decrement (fails if insufficient)

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

SUPABASE_SERVICE_ROLE_KEY=your-service-role-key## ⏱ Scheduled Jobs (Render)

PANDA_SCORE_TOKEN=your-pandascore-token

```Defined in `render.yaml`:

 

### 4. Sync match data- scraper (hourly) – Runs `python backend/scraper.py`

- settlement (every 15 min) – Runs `python backend/scraper.py settle`

```bash- model-api web service – Serves /predict/kills endpoint

pip install requests python-dotenv supabase

python ml/sync_matches.py## 🤖 ML Model

```

- Training script: `backend/train_model.py`

This fetches this week's VCT and CDL matches, team rosters, and generates prop lines.- Artifact: `backend/kill_predictor_model.pkl`

- Features: encoded agent/map context + historical performance (initial version may use limited features)

### 5. Run the frontend- Future improvements: richer map/agent features, model versioning column in prop_lines.



```bash## 🔐 Environment Variables (Selected)

cd packages/web

pnpm devBackend:

``` 

- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Visit [http://localhost:3000](http://localhost:3000).- LOCK_WINDOW_MIN (minutes before start to lock entries)

- ALLOWED_IMG_HOSTS

## DeploymentFrontend:

 

**Frontend** is deployed to **Vercel** from the `packages/web` directory. Set these env vars in Vercel:- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

- NEXT_PUBLIC_API_URL (if using internal API proxy)

- `NEXT_PUBLIC_SUPABASE_URL`

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`## 🔄 Development Workflows



**Weekly sync** runs via GitHub Actions. Add these as repository secrets:- Add new prop types: insert into prop_types; extend scraper for prediction method.

- Retrain model: update training data, run train_model.py, commit new .pkl.

- `NEXT_PUBLIC_SUPABASE_URL`- Deployment trigger: push to main (Render autodeploy) or create empty commit.

- `SUPABASE_SERVICE_ROLE_KEY`

- `PANDA_SCORE_TOKEN`## 🛡 Security Considerations



The sync runs automatically every Monday at 6am UTC. You can also trigger it manually from the Actions tab.- Service role key must remain backend-only (never ship to browser)

- Consider enabling RLS and policies for matches/prop_lines read operations

## Data Pipeline- Add model version field to track evolving predictions



`ml/sync_matches.py` does the following each week:## 🗺️ Roadmap Ideas



1. Fetches upcoming + live matches from PandaScore for VCT (league 4531) and CDL (league 4304)- Agent/map-aware advanced models (XGBoost, LightGBM)

2. Filters to the current week (Monday–Sunday)- Additional prop types (ACS, Headshot %, First Bloods)

3. Batch-fetches team rosters (one API call per unique team, cached)- Live odds adjustments mid-series

4. Upserts teams, players, matches, and events into Supabase- User authentication enhancements & RLS policies

5. Generates prop lines with deterministic stat projections and ML confidence indicators- Observability: logging dashboard, tracing, health endpoints



## Database## 🤝 Contributing



Key tables:PRs welcome. Please open an issue for major changes first.



| Table | Purpose |1. Fork, branch from main

|-------|---------|2. Make change + add/update tests/docs

| `teams` | Team name, abbreviation, logo, game |3. Create PR with concise description

| `players` | Player IGN, real name, photo, role, team |

| `matches` | Two teams, start time, status, game, event |## 📜 License

| `prop_lines` | Player + match + stat type + line value + ML confidence |

| `entries` | User parlay entries with stake and payout |This project is licensed under the MIT License (see LICENSE).

| `entry_legs` | Individual over/under picks within an entry |

| `profiles` | User balance, wins, losses, streak |## ⚠️ Disclaimer



Key RPC functions:This platform is for educational and experimental purposes only. Not affiliated with Riot Games or Valorant esports organizers.


- `deduct_credits(user_id, amount)` — Atomic balance deduction
- `settle_prop_line(prop_line_id, actual_result)` — Score line, update legs and entries, credit winners

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

This platform is for educational and experimental purposes only. Not affiliated with Riot Games, Activision, or any esports league.
