"""Generate player projections from real match stats.

Workflow:
1. Load trained model artifact (train_model.py must have been run).
2. Pull recent PlayerMatchStat rows per player from DB.
3. Engineer features matching training feature_order:
   - historical_mean: all-time mean kills prior to last match
   - recent_mean: rolling mean (last 3 matches prior)
   - opponent_conceded_mean: placeholder (reuse historical_mean scaling)
   - days_since_last: days between last two matches (fallback 7)
4. Predict next-match kills and round to nearest 0.5 to create a line.
5. Upsert PlayerProjection rows (unique on (playerId, statType, matchId)).

Current Limitations:
- opponent_conceded_mean is a placeholder until team-level stats exist.
"""

import os
import pathlib
from datetime import datetime, timedelta
import argparse
import joblib
import psycopg2
import pandas as pd
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
MODEL_DIR = pathlib.Path(os.environ.get("MODEL_DIR", "ml/models"))
MODEL_PATH = MODEL_DIR / "player_kills_rf.joblib"
STAT_TYPE = os.environ.get("PROJECTION_STAT_TYPE", "Kills")

def fetch_player_stats(conn, min_games: int, lookback: int) -> pd.DataFrame:
    q = """
        SELECT "playerId", "matchId", kills, "createdAt"
        FROM "PlayerMatchStat"
        ORDER BY "createdAt" ASC
    """
    df = pd.read_sql(q, conn)
    if df.empty:
        return df
    # Filter players with enough games
    counts = df.groupby("playerId").size()
    keep = counts[counts >= min_games].index
    df = df[df.playerId.isin(keep)].copy()
    return df

def build_feature_rows(df: pd.DataFrame, feature_order, lookback: int) -> pd.DataFrame:
    rows = []
    for pid, g in df.groupby("playerId"):
        g = g.sort_values("createdAt").reset_index(drop=True)
        if len(g) < 2:
            continue
        g["historical_mean"] = g["kills"].expanding().mean().shift(1)
        g["recent_mean"] = g["kills"].rolling(lookback).mean().shift(1)
        g["days_since_last"] = g["createdAt"].diff().dt.total_seconds().div(86400).fillna(7)
        # Use last available row to predict the next match
        last = g.iloc[-1]
        feat = {
            "player_id": pid,
            "last_match_id": last.matchId,
            "historical_mean": last.historical_mean,
            "recent_mean": last.recent_mean,
            "days_since_last": last.days_since_last,
        }
        # Placeholder opponent conceded (scale hist mean)
        feat["opponent_conceded_mean"] = (feat["historical_mean"] or 0) * 0.95
        if any(pd.isna(feat[k]) for k in feature_order):
            continue
        rows.append(feat)
    if not rows:
        return pd.DataFrame(columns=["player_id","last_match_id", *feature_order])
    return pd.DataFrame(rows)

def round_line(value: float) -> float:
    return round(value * 2) / 2

def generate(min_games: int, lookback: int, dry_run: bool):
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL env var required")
    if not MODEL_PATH.exists():
        raise SystemExit(f"Model artifact not found at {MODEL_PATH}; run train_model.py first")

    artifact = joblib.load(MODEL_PATH)
    model = artifact["model"]
    feature_order = artifact["feature_order"]

    conn = psycopg2.connect(DATABASE_URL)
    stats_df = fetch_player_stats(conn, min_games=min_games, lookback=lookback)
    if stats_df.empty:
        print("No stats available meeting criteria; aborting.")
        return
    feature_df = build_feature_rows(stats_df, feature_order, lookback=lookback)
    if feature_df.empty:
        print("No feature rows built; aborting.")
        return
    X = feature_df[feature_order]
    preds = model.predict(X)

    now = datetime.utcnow()
    rows = []

    # Fetch upcoming scheduled matches (status SCHEDULED and in the future)
    cur = conn.cursor()
    cur.execute("SELECT id, \"scheduledAt\", \"teamA\", \"teamB\" FROM \"Match\" WHERE status='SCHEDULED' AND \"scheduledAt\" > NOW() ORDER BY \"scheduledAt\" ASC")
    scheduled_matches = cur.fetchall()
    # Map team name to list of upcoming match ids (could have multiple)
    team_future_matches = {}
    for mid, sched_at, teamA, teamB in scheduled_matches:
        for t in [teamA, teamB]:
            if not t:
                continue
            team_future_matches.setdefault(t, []).append((mid, sched_at))

    # Determine player -> team mapping
    cur.execute("SELECT id, team FROM \"Player\"")
    player_team = {pid: team for pid, team in cur.fetchall()}

    feature_records = feature_df.to_dict(orient="records")
    preds_list = list(preds)
    for feat, pred in zip(feature_records, preds_list):
        team = player_team.get(feat["player_id"])  # may be None
        match_id = None
        if team and team in team_future_matches:
            # choose earliest upcoming match for that team not already used
            upcoming = team_future_matches[team]
            if upcoming:
                match_id = upcoming[0][0]
        if not match_id:
            # Fallback synthetic match id (still supported if no schedule)
            match_id = f"{feat['last_match_id']}_next"  # legacy fallback
        line_val = round_line(float(pred))
        rows.append((feat["player_id"], STAT_TYPE, line_val, match_id, now))

    if dry_run:
        print("Dry run: would insert projections:")
        for r in rows[:10]:
            print(r)
        print(f"Total rows: {len(rows)}")
        return

    # cur already defined above

    # Using ON CONFLICT for atomic upsert based on new unique index
    upsert_sql = (
        "INSERT INTO \"PlayerProjection\" (\"playerId\", \"statType\", \"value\", \"matchId\", \"createdAt\") VALUES %s "
        "ON CONFLICT (\"playerId\", \"statType\", \"matchId\") DO UPDATE SET \"value\" = EXCLUDED.\"value\", \"createdAt\" = EXCLUDED.\"createdAt\""
    )
    execute_values(cur, upsert_sql, rows)
    conn.commit()
    print(f"Upserted {len(rows)} projections.")
    cur.close()
    conn.close()

def main():
    parser = argparse.ArgumentParser(description="Generate player projections from DB stats")
    parser.add_argument("--min-games", type=int, default=3, help="Minimum historical games required per player")
    parser.add_argument("--lookback", type=int, default=3, help="Window size for recent_mean rolling average")
    parser.add_argument("--dry-run", action="store_true", help="Compute and show projections without inserting")
    args = parser.parse_args()
    generate(min_games=args.min_games, lookback=args.lookback, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
