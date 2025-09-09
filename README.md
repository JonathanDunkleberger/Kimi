# 🎯 Valorant Props Platform

A full-stack experimental platform for generating, publishing, and settling player prop betting lines for professional Valorant esports matches. It ingests upcoming matches, predicts player kill totals with an ML model, allows users to place entries, and settles outcomes automatically using scraped scoreboards.

## ✨ Features

- Automated scraping of upcoming professional matches (VLR.gg) with roster enrichment
- Professional event filtering via keyword list (VCT, Masters, Champions, etc.)
- ML-driven prop line generation (RandomForest regression model for Total Kills)
- FastAPI model inference service and integration in scraper
- Secure credit deduction and prop line settlement via Postgres (Supabase) RPC functions
- Frontend (Next.js + Tailwind + shadcn/ui) for browsing matches, building entries, and viewing profile
- Scheduled cron jobs (Render) for continuous ingestion and settlement
- Direct Supabase REST querying on the frontend (RLS-friendly)

## 🧰 Tech Stack

Backend:
 
- Python, FastAPI, Playwright, Supabase Python client, scikit-learn, pandas
Frontend:
- Next.js (React + TypeScript), TailwindCSS, shadcn/ui
Infrastructure:
 
- Supabase (Postgres + Auth + Storage), Render (web service + cron jobs)
ML:
 
- RandomForestRegressor model predicting player match kills

## 🏗️ Architecture Overview

1. Scraper fetches upcoming matches, filters to approved events, enriches with rosters, and inserts matches & players.
2. For each player, model_infer predicts a Total Kills value; a prop line is inserted (prop_lines table).
3. Users place entries (parlays) selecting Over/Under on prop lines; credits are atomically deducted (deduct_credits function).
4. After matches complete, settlement job scrapes final scoreboard, calls settle_prop_line to score lines and payout winners.
5. Historical data collection + training script allow periodic model retraining; artifact (kill_predictor_model.pkl) versioned in repo.

## 📂 Repository Layout

```text
backend/
  scraper.py          # Match + roster scraping, prop line creation, settlement
  model_infer.py      # Lazy-loaded model prediction helpers
  train_model.py      # Training script for kill predictor
  training_data.py    # Historical data scraper producing player_stats.csv
  model_api/          # FastAPI inference service (predict endpoint)
  sql/                # Database functions (settle_prop_line, deduct_credits)
frontend/
  src/pages/          # Next.js pages (index, entries, account/admin etc.)
  src/components/     # UI components (MatchCard, BetSlip ...)
render.yaml           # Render deployment + cron definitions
README.md             # (This file)
```

## 🚀 Getting Started (Local Dev)

### ✅ Prerequisites

- Python 3.11+
- Node.js 18+
- Playwright browsers installed (for scraper)
- Supabase project (URL + anon + service role keys)

### 🛠 Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env  # populate SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
python scraper.py  # one-off run
```

Run model API service:

```bash
uvicorn model_api.main:app --reload --port 8001
```

### 💻 Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local  # ensure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Visit <http://localhost:3000> to view upcoming prop lines.
 

## 🗄️ Supabase Schema & Functions

Key tables: teams, players, matches, prop_types, prop_lines, entries, entry_legs, users, settlement_events.

Functions:
 
- settle_prop_line(prop_line_id, actual_result) – Scores line, updates legs & entries, credits winners
- deduct_credits(p_user_id, p_amount) – Atomic credit decrement (fails if insufficient)

## ⏱ Scheduled Jobs (Render)

Defined in `render.yaml`:
 
- scraper (hourly) – Runs `python backend/scraper.py`
- settlement (every 15 min) – Runs `python backend/scraper.py settle`
- model-api web service – Serves /predict/kills endpoint

## 🤖 ML Model

- Training script: `backend/train_model.py`
- Artifact: `backend/kill_predictor_model.pkl`
- Features: encoded agent/map context + historical performance (initial version may use limited features)
- Future improvements: richer map/agent features, model versioning column in prop_lines.

## 🔐 Environment Variables (Selected)

Backend:
 
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- LOCK_WINDOW_MIN (minutes before start to lock entries)
- ALLOWED_IMG_HOSTS
Frontend:
 
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_API_URL (if using internal API proxy)

## 🔄 Development Workflows

- Add new prop types: insert into prop_types; extend scraper for prediction method.
- Retrain model: update training data, run train_model.py, commit new .pkl.
- Deployment trigger: push to main (Render autodeploy) or create empty commit.

## 🛡 Security Considerations

- Service role key must remain backend-only (never ship to browser)
- Consider enabling RLS and policies for matches/prop_lines read operations
- Add model version field to track evolving predictions

## 🗺️ Roadmap Ideas

- Agent/map-aware advanced models (XGBoost, LightGBM)
- Additional prop types (ACS, Headshot %, First Bloods)
- Live odds adjustments mid-series
- User authentication enhancements & RLS policies
- Observability: logging dashboard, tracing, health endpoints

## 🤝 Contributing

PRs welcome. Please open an issue for major changes first.

1. Fork, branch from main
2. Make change + add/update tests/docs
3. Create PR with concise description

## 📜 License

This project is licensed under the MIT License (see LICENSE).

## ⚠️ Disclaimer

This platform is for educational and experimental purposes only. Not affiliated with Riot Games or Valorant esports organizers.
