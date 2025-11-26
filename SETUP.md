# Kimi Setup Guide

## Prerequisites

- Node.js 20.x
- Python 3.11+
- PostgreSQL Database (Supabase recommended)
- Clerk Account (for Authentication)
- PandaScore Account (for Esports Data)

## Environment Variables

Create a `.env` file in the root `valorant-props` directory (or `.env.local` in `packages/web` and `.env` in `packages/api`).

### Shared / API
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
PANDA_SCORE_TOKEN="your_pandascore_token"
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
ADMIN_TOKEN="some_secure_random_string"
```

### Web (Frontend)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_API_BASE="http://localhost:4000"
```

## Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Generate Prisma Client:
   ```bash
   pnpm prisma:generate
   ```

3. Push Database Schema:
   ```bash
   pnpm prisma:push
   ```

## Running the Project

### 1. Start the API
```bash
pnpm dev:api
```
Runs on `http://localhost:4000`.

### 2. Start the Frontend
```bash
pnpm dev:web
```
Runs on `http://localhost:3000`.

### 3. Run Data Ingestion (Cron Jobs)

To populate the database with matches and projections, run the Python scripts.

**Install Python Dependencies:**
```bash
pip install -r packages/api/ml/requirements.txt
```

**Run Odds Setter (Fetch Matches & Create Projections):**
```bash
# Ensure env vars are set or pass them inline
export DATABASE_URL="..."
export PANDA_SCORE_TOKEN="..."
python packages/api/ml/odds_setter.py --limit-matches 50
```

**Run Judge (Settle Bets):**
```bash
export DATABASE_URL="..."
export PANDA_SCORE_TOKEN="..."
export ADMIN_TOKEN="..."
export INTERNAL_API_BASE="http://localhost:4000"
python packages/api/ml/judge.py
```

## Deployment (Render)

The `render.yaml` is configured to deploy:
1. **Web Service**: The API (`packages/api`).
2. **Cron Job**: `odds-setter-job` (runs every 5 mins).
3. **Cron Job**: `judge-job` (runs every 1 min).

**Note:** The Frontend (`packages/web`) is typically deployed to Vercel or as a Static Site on Render. If deploying to Render as a Web Service, you'll need to add a service for it in `render.yaml` or configure it manually.

### Render Environment Variables
Ensure all the variables listed in the "Environment Variables" section are added to your Render services.
