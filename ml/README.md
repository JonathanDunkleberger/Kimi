# ML Pipeline (Player Stat Projections)

This folder houses an initial lightweight pipeline to train and serve a simple predictive model for player stat projections (e.g., kills). The intent is to iterate quickly and later replace with a more robust feature engineering & model selection process.

## Goals
1. Extract historical player match stats from the Postgres database (or a CSV fallback) 
2. Train a baseline regression model predicting a target stat (e.g. kills) per upcoming match context
3. Persist model artifact (joblib) to `ml/models/`
4. Generate new projections and write them into the `PlayerProjection` table via Prisma / raw SQL
5. Provide an interface (CLI scripts) to retrain and to generate projections

## Current Status
- Baseline: RandomForestRegressor with simplistic synthetic or placeholder data if DB not populated
- Feature set minimal: player historical average, recent form (rolling mean), opponent team average conceded (placeholder), time since last match
- TODO (future): incorporate map pool, role, event tier, opponent rating, side splits, momentum metrics, moving variance, player cluster embeddings

## Files
| File | Purpose |
|------|---------|
| `requirements.txt` | Python dependencies for ML tasks |
| `train_model.py` | Fetches data, trains baseline model, saves artifact |
| `generate_projections.py` | Loads model, creates projections for upcoming matches/players |

## Quick Start
```bash
# (Windows PowerShell) create & activate venv
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r ml/requirements.txt

# Train model (uses synthetic if DB empty)
python ml/train_model.py

# Generate projections (writes to DB)
python ml/generate_projections.py
```

## Environment Variables (augment .env.example)
```
DATABASE_URL=postgresql://...
MODEL_DIR=ml/models
PROJECTION_STAT_TYPE=Kills
STATS_CSV_PATH=ml/data/match_stats.csv
```

## Data Ingestion
1. Place or update a CSV at `ml/data/match_stats.csv` (override with `STATS_CSV_PATH`).
2. Columns required: `player_id, player_name, team, match_id, kills, match_date`.
3. Run:
	```bash
	python ml/ingest_stats.py
	```
4. Script upserts `Player` rows and inserts `PlayerMatchStat` rows (deleting duplicates by `(playerId, matchId)`).
5. Train:
	```bash
	python ml/train_model.py
	```
6. Generate projections:
	```bash
	python ml/generate_projections.py
	```

## Projection Logic (Baseline)
1. For each player with recent matches, compute base rate: mean of last N matches.
2. Adjust lightly using recent form (last 3 vs overall) and simple opponent conceded factor.
3. Clamp / round to one decimal (.5 increments) to create a line value.

### Real DB-Driven Generation
`generate_projections.py` now derives features from actual `PlayerMatchStat` rows:
- `historical_mean`: expanding mean of kills prior to the most recent match.
- `recent_mean`: rolling mean over the last `--lookback` matches (default 3) prior to most recent.
- `days_since_last`: gap in days between the last two matches (fallback 7 if unavailable).
- `opponent_conceded_mean`: placeholder scaled `historical_mean` until opponent/team tables exist.

Only players with at least `--min-games` (default 3) historical matches are considered. For each player the script predicts the next match (synthetic future `matchId` = last_match_id + `_next`).

CLI examples:
```bash
# Dry run (no DB writes) requiring at least 5 matches per player, lookback window of 4
python ml/generate_projections.py --min-games 5 --lookback 4 --dry-run

# Standard generation (writes projections)
python ml/generate_projections.py --min-games 3 --lookback 3
```

If no qualifying stats are found the script exits gracefully.

### Projection Uniqueness & Upsert
`PlayerProjection` now has a composite unique index on `(playerId, statType, matchId)`. The generation script performs an atomic upsert via `ON CONFLICT` to either insert a new projection or refresh the existing one (updating `value` and `createdAt`). This removes the prior delete-then-insert pattern and prevents transient gaps.

### Match Table Integration
A `Match` table with a `MatchStatus` enum (`SCHEDULED`, `LIVE`, `COMPLETED`, `CANCELED`) has been added. Each `PlayerProjection.matchId` and `PlayerMatchStat.matchId` can now reference a `Match` row. The projection generator upserts synthetic future matches (24h in the future) prior to inserting projections so downstream systems can reason about upcoming slates.

Backfill guidance after deploying the new schema:
```sql
-- 1. Create Match rows for historical stats that lack a Match record
INSERT INTO "Match" (id, "scheduledAt", status, "createdAt")
SELECT DISTINCT s."matchId", COALESCE(MIN(s."createdAt"), NOW()), 'COMPLETED', NOW()
FROM "PlayerMatchStat" s
LEFT JOIN "Match" m ON m.id = s."matchId"
WHERE m.id IS NULL
GROUP BY s."matchId";

-- 2. Create Match rows for existing projections (treat as SCHEDULED if not in stats)
INSERT INTO "Match" (id, "scheduledAt", status, "createdAt")
SELECT DISTINCT p."matchId", NOW(), 'SCHEDULED', NOW()
FROM "PlayerProjection" p
LEFT JOIN "Match" m ON m.id = p."matchId"
WHERE m.id IS NULL;
```

## Safety & Idempotency
- Generation script upserts projections for a (playerId, statType, matchId) triple.
- Future improvement: add versioning and drift monitoring.

## Next Steps
- Replace synthetic data path with real ingestion from match logs.
- Add evaluation metrics (MAE, MAPE) and model comparison.
- Introduce feature store abstraction.
- Add CI job to retrain daily if new data volume threshold is met.

## Automated Scheduling (Render Cron Job)
You can automate recurring projection generation using a Render Cron Job hitting the repository. Two options:

1. Separate Render Cron Job referencing this repo (recommended) that runs the shell script.
2. Existing web service with an internal task trigger endpoint (not yet implemented here).

### Provided Script
`scripts/projections_cron.sh` performs:
1. Optional conditional retrain (if model missing or older than `MODEL_MAX_AGE_HOURS`).
2. Projection generation via `ml/generate_projections.py`.

### Environment Variables
At minimum:
```
DATABASE_URL=postgresql://...
MODEL_DIR=ml/models
PROJECTION_STAT_TYPE=Kills
MODEL_MAX_AGE_HOURS=24           # optional; retrain threshold
MIN_GAMES=3                      # optional; passed to generator
LOOKBACK=3                       # optional; passed to generator
```

### Render Cron Setup
In Render dashboard:
1. New > Cron Job.
2. Connect repo & branch.
3. Schedule expression (UTC), e.g. `0 * * * *` for hourly.
4. Command:
	```bash
	bash scripts/projections_cron.sh
	```
5. Add environment variables as above.

### Local Test
```bash
bash scripts/projections_cron.sh
```

### Notes
- The script assumes dependencies are already installed during build (use a Render build command like `pip install -r ml/requirements.txt`).
- Set `SKIP_TRAIN=1` if you want projection-only runs.
- Logs will show whether the existing model was reused or retrained.

## Schedule Ingestion Workflow
To supply real upcoming matches instead of synthetic IDs:
1. Prepare a CSV at `ml/data/schedule.csv` (or override via `SCHEDULE_CSV_PATH`).
2. Required columns: `match_id, scheduled_at, team_a, team_b`. Optional: `event, map`.
3. Run:
	```bash
	python ml/ingest_schedule.py
	```
4. This upserts rows into `Match` (status `SCHEDULED`).
5. Run projection generation; the script selects upcoming `Match` rows and assigns projections to the earliest future match for each player's team. If no scheduled match exists, it falls back to a legacy synthetic `<last_match_id>_next` identifier.

Environment variables:
```
SCHEDULE_CSV_PATH=ml/data/schedule.csv
SCHEDULE_HORIZON_HOURS=0  # (future) limit to matches within horizon
```

Planned enhancements:
- Horizon filtering and status transitions (SCHEDULED -> LIVE -> COMPLETED).
- External API ingestion for continuous schedule updates.
- Match-level metadata enrichment (event tier, region) for future model features.

## Automatic Match Status Transitions
Script: `ml/update_match_statuses.py`

Purpose: Idempotently advance matches through lifecycle:
- `SCHEDULED` -> `LIVE` when current time >= `scheduledAt - MATCH_LIVE_LEAD_MINUTES`.
- `LIVE` -> `COMPLETED` when current time >= `scheduledAt + MATCH_AUTOCOMPLETE_MINUTES`.
- Optional rollback (`LIVE` -> `SCHEDULED`) if `MATCH_ALLOW_ROLLBACK=1` and the scheduled time is moved forward.

Environment variables:
```
MATCH_LIVE_LEAD_MINUTES=0      # minutes before scheduledAt to mark LIVE
MATCH_AUTOCOMPLETE_MINUTES=90  # minutes after scheduledAt to mark COMPLETED
MATCH_ALLOW_ROLLBACK=0         # set to 1 to allow rollback if schedule moves
```

Run manually:
```bash
python ml/update_match_statuses.py
```

Cron integration: The `scripts/projections_cron.sh` already invokes this script first so projection generation operates on up-to-date statuses.

Future improvements:
- Replace time-based completion with result ingestion trigger.
- Track actual match duration and apply buffer heuristics.
- Emit metrics for transition counts per run.
