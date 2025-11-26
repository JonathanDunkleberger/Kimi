"""Odds-Setter Cron Script

Generates player projections for upcoming Valorant matches using the latest
trained model artifact (e.g. kills_per_round) and writes them into the
Postgres database used by the API (PlayerProjection table).

Steps:
 1. Load environment (.env / process) for DATABASE_URL & PANDA_SCORE_TOKEN.
 2. Load latest model artifact (models/latest_<target>.joblib).
 3. Load consolidated training_data.csv to build a feature cache per player.
 4. Fetch upcoming matches from PandaScore.
 5. For each match, ensure Match + Player rows exist; build feature vectors
    for each player (fall back to zeros if unseen) and predict.
 6. Upsert PlayerProjection rows (ON CONFLICT update value).

Assumptions / Limitations:
 - Feature engineering for live odds currently uses the most recent row in
   training_data.csv for each player (aggregated historical stats). If a
   player is unseen, zeros are used (prediction may skew low).
 - Target assumed to be 'kills_per_round'. Adjust via --target.
 - statType stored as 'Kills Per Round' (frontend display). Adjust STAT_TYPE.
 - PandaScore player & match fields may differ; adapt key mapping if API
   shape changes.

Usage:
  python packages/api/ml/odds_setter.py \
      --target kills_per_round \
      --limit-matches 30

Environment:
  DATABASE_URL=postgres://user:pass@host:port/dbname
  PANDA_SCORE_TOKEN=xxxxx (or pass --token)

Cron Example (every 30 min):
  */30 * * * * /usr/bin/python /app/packages/api/ml/odds_setter.py >> /var/log/odds_setter.log 2>&1

Exit Codes:
  0 success (even if some players skipped)
  1 configuration / fatal errors
"""
from __future__ import annotations
import os
import sys
import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
import requests
import psycopg2
import psycopg2.extras
import joblib
from dotenv import load_dotenv
from uuid import uuid4

ROOT = Path(__file__).parent
MODELS_DIR = ROOT / 'models'
DATA_CSV = ROOT / 'data' / 'training_data.csv'

STAT_TYPE_DISPLAY = 'Kills'


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--target', default='kills_per_round', help='Model target name used in artifact filename (latest_<target>.joblib)')
    p.add_argument('--token', default=None, help='PandaScore API token (fallback PANDA_SCORE_TOKEN env)')
    p.add_argument('--limit-matches', type=int, default=50, help='Limit number of upcoming matches pulled')
    p.add_argument('--dry-run', action='store_true', help='Do everything except DB writes')
    p.add_argument('--verbose', action='store_true')
    p.add_argument('--loop', action='store_true', help='Run in a continuous loop')
    p.add_argument('--interval', type=int, default=300, help='Sleep interval in seconds (default 5m)')
    return p.parse_args()


def log(msg: str, *, error: bool = False):
    stream = sys.stderr if error else sys.stdout
    print(f"[odds_setter] {msg}", file=stream)


def load_model(target: str):
    path = MODELS_DIR / f'latest_{target}.joblib'
    if not path.exists():
        raise FileNotFoundError(f"Model artifact not found: {path}")
    artifact = joblib.load(path)
    model = artifact.get('model')
    meta = artifact.get('metadata', {})
    if model is None:
        raise RuntimeError('Model object missing in artifact.')
    feature_cols = meta.get('feature_cols')
    if not feature_cols:
        raise RuntimeError('feature_cols missing in model metadata.')
    return model, feature_cols, meta


def build_feature_cache(feature_cols: List[str]) -> Dict[str, Dict[str, float]]:
    if not DATA_CSV.exists():
        raise FileNotFoundError(f"Missing training dataset: {DATA_CSV}")
    df = pd.read_csv(DATA_CSV)
    # Coerce required numeric columns
    for c in feature_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce')
    # Latest row per player (assumes dataset sorted by year/tournament earlier)
    if 'player' not in df.columns:
        raise RuntimeError('training_data.csv missing player column')
    latest = df.groupby('player', as_index=False).tail(1)
    cache: Dict[str, Dict[str, float]] = {}
    for _, row in latest.iterrows():
        cache[str(row['player']).strip()] = {c: float(row[c]) if c in row and pd.notna(row[c]) else 0.0 for c in feature_cols}
    return cache


def fetch_upcoming_matches(token: str, limit: int) -> List[Dict[str, Any]]:
    url = f'https://api.pandascore.co/valorant/matches/upcoming'
    params = {'per_page': 100}  # Fetch more to filter
    headers = {'Authorization': f'Bearer {token}'}
    resp = requests.get(url, params=params, headers=headers, timeout=20)
    if resp.status_code != 200:
        raise RuntimeError(f"PandaScore error {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    
    # Filter for Tier 1 VCT and Game Changers
    filtered = []
    keywords = ['champions tour', 'vct', 'game changers']
    for m in data:
        league_name = m.get('league', {}).get('name', '').lower()
        if any(k in league_name for k in keywords):
            filtered.append(m)
            
    # Trim if limit < per_page
    return filtered[:limit]


def connect_db(url: str):
    conn = psycopg2.connect(url)
    conn.autocommit = True
    return conn


def ensure_match(conn, match: Dict[str, Any]):
    # Prisma Match schema: id (String), scheduledAt (DateTime), status (enum), map?, event?, teamA?, teamB?
    match_id = str(match.get('id'))
    scheduled_at = match.get('scheduled_at') or match.get('begin_at')
    status = 'SCHEDULED'
    name = match.get('name') or ''
    opponents = match.get('opponents') or []
    teamA = opponents[0]['opponent']['acronym'] if len(opponents) > 0 and opponents[0].get('opponent') else None
    teamB = opponents[1]['opponent']['acronym'] if len(opponents) > 1 and opponents[1].get('opponent') else None
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "Match" (id, "scheduledAt", status, event, "teamA", "teamB")
            VALUES (%s, COALESCE(%s, NOW()), %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET "scheduledAt"=EXCLUDED."scheduledAt", status=EXCLUDED.status, event=EXCLUDED.event, "teamA"=EXCLUDED."teamA", "teamB"=EXCLUDED."teamB";
            """,
            (match_id, scheduled_at, status, name, teamA, teamB)
        )
    return match_id


def ensure_player(conn, player: Dict[str, Any]):
    # Player schema: id (String), name, team, imageUrl
    pid = str(player.get('id') or uuid4())
    name = player.get('name') or player.get('slug') or f"player_{pid}"
    team = None
    if player.get('current_team') and isinstance(player['current_team'], dict):
        team = player['current_team'].get('acronym') or player['current_team'].get('name')
    image_url = player.get('image_url') or player.get('image') or None
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "Player" (id, name, team, "imageUrl")
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, team=COALESCE(EXCLUDED.team, "Player".team), "imageUrl"=COALESCE(EXCLUDED."imageUrl", "Player"."imageUrl");
            """,
            (pid, name, team, image_url)
        )
    return pid, name


def upsert_projection(conn, player_id: str, stat_type: str, match_id: str, value: float):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "PlayerProjection" (id, "playerId", "statType", value, "matchId", "createdAt")
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT ("playerId", "statType", "matchId")
            DO UPDATE SET value=EXCLUDED.value, "createdAt"=NOW();
            """,
            (str(uuid4()), player_id, stat_type, value, match_id)
        )


def build_feature_vector(player_name: str, feature_cols: List[str], cache: Dict[str, Dict[str, float]]):
    # Exact match first; attempt case-insensitive fallback
    if player_name in cache:
        return cache[player_name]
    lowered = {k.lower(): k for k in cache.keys()}
    key = lowered.get(player_name.lower())
    if key:
        return cache[key]
    return {c: 0.0 for c in feature_cols}


def run_once(args, token, db_url, model, feature_cols, feature_cache):
    try:
        matches = fetch_upcoming_matches(token, args.limit_matches)
    except Exception as e:
        log(f'Failed to fetch upcoming matches: {e}', error=True)
        return

    if not matches:
        log('No upcoming matches returned by API')
        return

    conn = None
    if not args.dry_run:
        try:
            conn = connect_db(db_url)
        except Exception as e:
            log(f'Database connection failed: {e}', error=True)
            return

    total_projections = 0
    skipped_players = 0

    for m in matches:
        try:
            match_id = ensure_match(conn, m) if conn else str(m.get('id'))
        except Exception as e:
            log(f'Skip match {m.get("id")}: ensure_match failed: {e}', error=True)
            continue

        players = m.get('players') or []
        if not players:
            log(f'Match {m.get("id")}: no players array; skipping player projections')
            continue

        for p in players:
            try:
                pid, pname = ensure_player(conn, p) if conn else (str(p.get('id') or uuid4()), p.get('name') or 'unknown')
            except Exception as e:
                log(f'Failed ensure_player for match {m.get("id")} player {p.get("id")}: {e}', error=True)
                skipped_players += 1
                continue

            feats_dict = build_feature_vector(pname, feature_cols, feature_cache)
            feats = [feats_dict[c] for c in feature_cols]
            try:
                pred = float(model.predict([feats])[0])
            except Exception as e:
                log(f'Prediction failed for player {pname}: {e}', error=True)
                skipped_players += 1
                continue

            projection_value = max(0.0, round(pred, 2))
            if args.verbose:
                log(f'Predict {pname} match={match_id} value={projection_value}')
            if not args.dry_run and conn:
                try:
                    upsert_projection(conn, pid, STAT_TYPE_DISPLAY, match_id, projection_value)
                except Exception as e:
                    log(f'Upsert projection failed player {pname}: {e}', error=True)
                    skipped_players += 1
                    continue
            total_projections += 1

    if conn:
        conn.close()
    log(f'Done. projections={total_projections} skipped_players={skipped_players}')


def main():
    load_dotenv()  # optional .env
    args = parse_args()
    token = args.token or os.getenv('PANDA_SCORE_TOKEN') or os.getenv('PANDASCORE_TOKEN')
    if not token:
        log('Missing PandaScore token (--token or PANDA_SCORE_TOKEN env)', error=True)
        sys.exit(1)
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        log('DATABASE_URL not set in environment', error=True)
        sys.exit(1)

    try:
        model, feature_cols, meta = load_model(args.target)
    except Exception as e:
        log(f'Failed to load model: {e}', error=True)
        sys.exit(1)

    try:
        feature_cache = build_feature_cache(feature_cols)
    except Exception as e:
        log(f'Feature cache build failed: {e}', error=True)
        sys.exit(1)

    log(f'Model loaded target={args.target} features={len(feature_cols)} players_in_cache={len(feature_cache)}')

    if args.loop:
        log(f"Starting odds_setter in loop mode (interval={args.interval}s)")
        while True:
            try:
                run_once(args, token, db_url, model, feature_cols, feature_cache)
            except Exception as e:
                log(f"Unexpected error in loop: {e}", error=True)
            time.sleep(args.interval)
    else:
        run_once(args, token, db_url, model, feature_cols, feature_cache)


if __name__ == '__main__':
    main()
