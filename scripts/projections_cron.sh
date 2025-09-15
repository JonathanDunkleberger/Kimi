#!/usr/bin/env bash
# Cron-executable script to generate player projections.
# Designed for Render Cron Job or any scheduler.
# Assumes working directory is repository root (contains ml/ directory).
# Environment variables expected:
#   DATABASE_URL              (required) Postgres connection string
#   MODEL_DIR                 (optional) Defaults to ml/models
#   PROJECTION_STAT_TYPE      (optional) Defaults to Kills
#   MODEL_MAX_AGE_HOURS       (optional) Retrain if existing model older than this (default 24)
#   MIN_GAMES                 (optional) Min games per player (default 3)
#   LOOKBACK                  (optional) Rolling window size for recent_mean (default 3)
#   SKIP_TRAIN                (optional) If set to 1, skip retraining logic
#
# Build-time (outside this script) you should have already run:
#   pip install -r ml/requirements.txt
# If not, you can uncomment the install lines below, but doing so every run slows execution.

set -euo pipefail

log() { echo "[projections-cron] $*"; }

# Uncomment if you prefer to install each run (not recommended for Render where build cache exists)
# log "Installing dependencies (cold start)" 
# pip install -q -r ml/requirements.txt

MODEL_DIR=${MODEL_DIR:-ml/models}
MODEL_PATH="$MODEL_DIR/player_kills_rf.joblib"
MODEL_MAX_AGE_HOURS=${MODEL_MAX_AGE_HOURS:-24}
MIN_GAMES=${MIN_GAMES:-3}
LOOKBACK=${LOOKBACK:-3}

if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL not set" >&2
  exit 1
fi

log "Starting cron run at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
python --version || true

log "Updating match statuses (SCHEDULED -> LIVE -> COMPLETED)"
python ml/update_match_statuses.py || log "Match status updater failed (continuing)"

maybe_train() {
  if [ "${SKIP_TRAIN:-0}" = "1" ]; then
    log "Skipping training (SKIP_TRAIN=1)"
    return
  fi
  if [ ! -f "$MODEL_PATH" ]; then
    log "Model missing; training new model"
    python ml/train_model.py
    return
  fi
  # Determine model age (Linux stat)
  mod_epoch=$(stat -c %Y "$MODEL_PATH" 2>/dev/null || echo 0)
  now_epoch=$(date +%s)
  age_hours=$(( ( now_epoch - mod_epoch ) / 3600 ))
  if [ $age_hours -ge $MODEL_MAX_AGE_HOURS ]; then
    log "Model age ${age_hours}h >= ${MODEL_MAX_AGE_HOURS}h; retraining"
    python ml/train_model.py
  else
    log "Reusing existing model (age ${age_hours}h < ${MODEL_MAX_AGE_HOURS}h)"
  fi
}

maybe_train

log "Generating projections (min_games=$MIN_GAMES, lookback=$LOOKBACK)"
python ml/generate_projections.py --min-games "$MIN_GAMES" --lookback "$LOOKBACK"

log "Cron run complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
