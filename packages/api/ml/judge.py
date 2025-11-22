"""Judge Cron Script

Purpose:
  1. Fetch recently completed Valorant matches from PandaScore.
  2. For each completed match, gather final player stats relevant to our
     current projection stat type (Kills Per Round -> total kills; we use kills
     as the actual and compare to projected value in settlement endpoint logic).
  3. Call internal settlement endpoint /settlements with results for picks
     whose underlying projections belong to those matches.

Simplifications:
  - We only settle picks where statType = 'Kills Per Round'. Actual is derived
    from kills collected from PandaScore player stats for the completed match.
  - If a player projection statType differs, we skip that pick.
  - If player/match kills not found, that pick is skipped until next run.

Environment:
  DATABASE_URL             (for direct queries to map projections->picks)
  PANDA_SCORE_TOKEN        (API token for PandaScore)
  ADMIN_TOKEN              (token to authorize /settlements endpoint)
  INTERNAL_API_BASE        (e.g. http://localhost:4000 or deployed URL)

CLI:
  python packages/api/ml/judge.py --minutes-back 180 --limit-matches 40 --dry-run

"""
from __future__ import annotations
import os
import sys
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

import requests
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

import time

STAT_TYPE = 'Kills Per Round'


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--minutes-back', type=int, default=180, help='Look back window for completed matches')
    p.add_argument('--limit-matches', type=int, default=80, help='Max completed matches to inspect')
    p.add_argument('--dry-run', action='store_true', help='Do not POST settlements; just print planned payload')
    p.add_argument('--verbose', action='store_true')
    p.add_argument('--loop', action='store_true', help='Run in a continuous loop (for background workers)')
    p.add_argument('--interval', type=int, default=60, help='Sleep interval in seconds when looping')
    return p.parse_args()


def log(msg: str, *, error: bool = False):
    stream = sys.stderr if error else sys.stdout
    print(f"[judge] {msg}", file=stream)


def fetch_recent_completed(token: str, limit: int) -> List[Dict[str, Any]]:
    # Filter completed matches; PandaScore supports status filters via endpoint variations
    url = 'https://api.pandascore.co/valorant/matches/past'
    headers = {'Authorization': f'Bearer {token}'}
    params = {'per_page': min(limit, 100)}
    r = requests.get(url, headers=headers, params=params, timeout=20)
    if r.status_code != 200:
        raise RuntimeError(f'PandaScore response {r.status_code}: {r.text[:200]}')
    return r.json()


def connect_db(url: str):
    conn = psycopg2.connect(url)
    conn.autocommit = True
    return conn


def load_unsettled_picks_for_matches(conn, match_ids: List[str]):
    # Returns rows with pick id, projection id, player id, match id, target stat type, projected value
    sql = """
    SELECT pk.id as pick_id, pj.id as projection_id, pj."playerId" as player_id, pj."matchId" as match_id,
           pj."statType" as stat_type, pj.value as projected_value
    FROM "Pick" pk
    JOIN "PlayerProjection" pj ON pk."playerProjectionId" = pj.id
    WHERE pk."isWin" IS NULL
      AND pj."matchId" = ANY(%s)
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, (match_ids,))
        return cur.fetchall()


def build_results_payload(picks: List[Dict[str, Any]], kills_map: Dict[str, float]):
    results = []
    for p in picks:
        if p['stat_type'] != STAT_TYPE:
            continue
        actual = kills_map.get(p['player_id'])
        if actual is None:
            continue
        # Actual kills vs projection of kills per round: use kills directly.
        results.append({'pickId': p['pick_id'], 'actual': float(actual)})
    return results


def fetch_match_player_kills(token: str, match: Dict[str, Any]) -> Dict[str, float]:
    kills_by_player: Dict[str, float] = {}
    # If match JSON already carries players with stats use them; else may require per-game requests (simplified)
    players = match.get('players') or []
    for pl in players:
        pid = str(pl.get('id'))
        kills = pl.get('stats', {}).get('kills') if isinstance(pl.get('stats'), dict) else pl.get('kills')
        if kills is None:
            continue
        try:
            kills_by_player[pid] = float(kills)
        except Exception:
            continue
    return kills_by_player


def post_settlements(base_url: str, admin_token: str, results: List[Dict[str, Any]]):
    url = base_url.rstrip('/') + '/settlements'
    r = requests.post(url, json={'results': results}, headers={'x-admin-token': admin_token}, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f'Settlements failed {r.status_code}: {r.text[:200]}')
    return r.json()

def run_once(args, token, admin_token, api_base, db_url):
    try:
        conn = connect_db(db_url)
    except Exception as e:
        log(f'Database connection failed: {e}', error=True)
        return

    lookback_cutoff = datetime.now(timezone.utc) - timedelta(minutes=args.minutes_back)

    try:
        completed = fetch_recent_completed(token, args.limit_matches)
    except Exception as e:
        log(f'Failed to fetch completed matches: {e}', error=True)
        conn.close()
        return

    # Filter by time window
    relevant: List[Dict[str, Any]] = []
    for m in completed:
        finished_at = m.get('end_at') or m.get('finished_at') or m.get('modified_at')
        try:
            if finished_at:
                dt = datetime.fromisoformat(finished_at.replace('Z','+00:00'))
                if dt >= lookback_cutoff:
                    relevant.append(m)
        except Exception:
            continue

    if not relevant:
        log('No recently completed matches in window')
        conn.close()
        return

    match_ids = [str(m.get('id')) for m in relevant if m.get('id')]
    if not match_ids:
        log('No valid match IDs after filtering')
        conn.close()
        return

    try:
        unsettled = load_unsettled_picks_for_matches(conn, match_ids)
    except Exception as e:
        log(f'Failed to load unsettled picks: {e}', error=True)
        conn.close()
        return

    if not unsettled:
        log('No unsettled picks for recent matches')
        conn.close()
        return

    # Build kills map aggregated from each match
    kills_map: Dict[str, float] = {}
    for m in relevant:
        km = fetch_match_player_kills(token, m)
        kills_map.update(km)

    results_payload = build_results_payload(unsettled, kills_map)
    conn.close()

    if not results_payload:
        log('No results to settle (missing player kills)')
        return

    if args.dry_run or args.verbose:
        log(f'Prepared settlements count={len(results_payload)} sample={results_payload[:3]}')
    if args.dry_run:
        return

    try:
        resp = post_settlements(api_base, admin_token, results_payload)
        log(f'Settlements response: {resp}')
    except Exception as e:
        log(f'Settlements POST failed: {e}', error=True)


def main():
    load_dotenv()
    args = parse_args()
    token = os.getenv('PANDA_SCORE_TOKEN') or os.getenv('PANDASCORE_TOKEN')
    if not token:
        log('Missing PandaScore token', error=True)
        sys.exit(1)
    admin_token = os.getenv('ADMIN_TOKEN')
    if not admin_token:
        log('Missing ADMIN_TOKEN for settlements auth', error=True)
        sys.exit(1)
    api_base = os.getenv('INTERNAL_API_BASE', 'http://localhost:4000')
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        log('DATABASE_URL missing', error=True)
        sys.exit(1)

    if args.loop:
        log(f"Starting judge in loop mode (interval={args.interval}s)")
        while True:
            try:
                run_once(args, token, admin_token, api_base, db_url)
            except Exception as e:
                log(f"Unexpected error in loop: {e}", error=True)
            time.sleep(args.interval)
    else:
        run_once(args, token, admin_token, api_base, db_url)


if __name__ == '__main__':
    main()
