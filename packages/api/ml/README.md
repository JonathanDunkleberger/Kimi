# ML Pipeline (API Package)

## Overview

This directory contains scripts to preprocess historical Valorant data and train predictive models.

## Files

- `preprocess_data.py`: Recursively scans the Kaggle dataset (placed under `data/Val-historical-stats/`) and produces `data/training_data.csv` with cleaned + engineered features.
- `train_model.py`: Trains a regression model (default target `kills_per_round`) and outputs versioned model artifacts + metrics.

## Preprocessing

Run after placing the dataset:

```bash
python packages/api/ml/preprocess_data.py
```

Output: `packages/api/ml/data/training_data.csv`.

## Training

Basic run (defaults to HistGradientBoostingRegressor predicting kills_per_round):

```bash
python packages/api/ml/train_model.py
```

Advanced options:

```bash
python packages/api/ml/train_model.py \
  --target kills_per_round \
  --model hgb \
  --limit-year 2023,2024 \
  --min-rounds 30 \
  --test-size 0.25 \
  --max-rows 50000
```

### Targets

- `kills_per_round` (derived)
- Any existing numeric column (e.g. `rating`, `acs`).

### Models

- `hgb`: HistGradientBoostingRegressor (default)
- `rf`: RandomForestRegressor

## Artifacts

Generated in `packages/api/ml/models/`:

- `model_{target}_{timestamp}.joblib` – serialized model + metadata.
- `metrics_{target}_{timestamp}.json` – metrics (MAE, RMSE, R2, feature importance).
- `latest_{target}.joblib` – copy/symlink to the latest model for that target.

## Metrics Logged

- Mean Absolute Error (MAE)
- Root Mean Square Error (RMSE)
- R² Score
- Feature importance (tree-based models)

## Next Ideas

- Cross-validation with time-based splits.
- Agent / map one-hot encoding.
- Player / team embeddings via target encoding.
- Model registry integration (e.g., MLflow).

## Troubleshooting

- If `training_data.csv` missing: re-run preprocess script.
- Year filter returns 0 rows: confirm the `year` column exists in dataset (check preprocess output).
- Windows symlink failures: falls back to copying `latest_{target}.joblib`.

## Odds-Setter Cron

Script: `odds_setter.py` fetches upcoming matches (PandaScore), loads `latest_{target}.joblib`, builds feature vectors from `training_data.csv` (latest row per player), predicts, and upserts projections (`PlayerProjection`) with statType `Kills Per Round`.

Environment vars required:

```bash
DATABASE_URL=postgres://user:pass@host:5432/db
PANDA_SCORE_TOKEN=your_token
```

Run manually:

```bash
python packages/api/ml/odds_setter.py --target kills_per_round --limit-matches 25 --verbose
```

Dry run (no DB writes):

```bash
python packages/api/ml/odds_setter.py --dry-run --verbose
```

Example cron (every 30 min):

```cron
*/30 * * * * /usr/bin/python /app/packages/api/ml/odds_setter.py >> /var/log/odds_setter.log 2>&1
```

To adjust the displayed stat label, edit `STAT_TYPE_DISPLAY` inside `odds_setter.py`.

## Judge Cron

Script: `judge.py` settles picks for recently completed matches.

Flow:

1. Fetch past matches (`/valorant/matches/past`) and filter by time window (default 180 minutes).
2. Gather unsettled picks whose projections belong to those matches.
3. Extract player kills from match payload for statType `Kills Per Round`.
4. POST results to internal `/settlements` with admin token.

Run (dry run):

```bash
python packages/api/ml/judge.py --dry-run --verbose --minutes-back 240
```

Cron example (every 15 min):

```cron
*/15 * * * * /usr/bin/python /app/packages/api/ml/judge.py >> /var/log/judge.log 2>&1
```

---

Maintained as part of the API ML workflow.
