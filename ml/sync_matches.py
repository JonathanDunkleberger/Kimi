#!/usr/bin/env python3
"""
sync_matches.py — Fetch this week's VCT and CDL matches from PandaScore,
upsert teams/players/matches into Supabase, and generate prop lines.

Only syncs professional-level matches:
  • VCT  (Valorant Champions Tour)  — league_id 4531
  • CDL  (Call of Duty League)      — league_id 4304

Limits to one week of matches at a time.

Optimised to minimise API calls:
  1. Fetch matches (2 calls per game — upcoming + running)
  2. Collect unique team IDs across ALL matches
  3. Batch-fetch rosters once per team (generic /teams/{id})
  4. Upsert everything into Supabase in a single pass

Usage:
  python ml/sync_matches.py

Environment:
  NEXT_PUBLIC_SUPABASE_URL   (required)
  SUPABASE_SERVICE_ROLE_KEY  (required)
  PANDA_SCORE_TOKEN          (required)
"""
import os
import sys
import time
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
PANDA_TOKEN  = os.environ.get("PANDA_SCORE_TOKEN")

if not all([SUPABASE_URL, SUPABASE_KEY, PANDA_TOKEN]):
    print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PANDA_SCORE_TOKEN")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

PANDASCORE_BASE = "https://api.pandascore.co"
HEADERS = {"Authorization": f"Bearer {PANDA_TOKEN}", "Accept": "application/json"}

# ── League allow-list (professional only) ───────────────────────────────────

LEAGUES = {
    "valorant": {
        "prefix": "valorant",
        "db_game": "valorant",
        "league_id": 4531,
        "label": "VCT",
    },
    "codmw": {
        "prefix": "codmw",
        "db_game": "cod",
        "league_id": 4304,
        "label": "CDL",
    },
}

DEFAULT_COLORS = {"valorant": "#FF4655", "cod": "#1E90FF"}

# ── Stat templates for prop-line generation ─────────────────────────────────

STAT_TEMPLATES = {
    "valorant": [
        {"prop": "Kills",   "mean": 17.0, "std": 3.5},
        {"prop": "Deaths",  "mean": 14.0, "std": 2.5},
        {"prop": "Assists", "mean": 4.5,  "std": 1.5},
    ],
    "cod": [
        {"prop": "Kills",              "mean": 24.0, "std": 4.0},
        {"prop": "Total Series Kills", "mean": 105.0, "std": 15.0},
        {"prop": "Map 1 Kills",        "mean": 8.5,  "std": 2.0},
        {"prop": "Map 2 Kills",        "mean": 8.5,  "std": 2.0},
        {"prop": "Map 3 Kills",        "mean": 8.5,  "std": 2.0},
        {"prop": "Damage",             "mean": 3200.0, "std": 400.0},
    ],
}

# ── Caches (populated once, reused across all matches) ──────────────────────

_prop_type_cache: Dict[str, str] = {}
_team_roster_cache: Dict[int, list] = {}

# ── Helpers ─────────────────────────────────────────────────────────────────

def api_get(path: str, params: dict = None):
    """GET from PandaScore with retry + rate-limit handling."""
    url = f"{PANDASCORE_BASE}{path}"
    for attempt in range(4):
        try:
            resp = requests.get(url, headers=HEADERS, params=params or {}, timeout=30)
        except requests.exceptions.ConnectionError:
            print(f"    ↻ connection error on {path}, retry {attempt + 1}…")
            time.sleep(3)
            continue
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 3))
            print(f"    ↻ rate-limited, waiting {wait}s…")
            time.sleep(wait)
            continue
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        time.sleep(0.35)
        return resp.json()
    return None


def round_half(v: float) -> float:
    return round(v * 2) / 2


def det_confidence(player: str, prop: str) -> int:
    h = int(hashlib.md5(f"{player}:{prop}".encode()).hexdigest(), 16)
    return 55 + (h % 28)


def det_direction(player: str, prop: str) -> str:
    h = int(hashlib.md5(f"{player}:{prop}:dir".encode()).hexdigest(), 16)
    return "over" if h % 2 == 0 else "under"


def week_bounds() -> tuple:
    """Return (monday 00:00 UTC, sunday 23:59:59 UTC) for the current week."""
    now = datetime.now(timezone.utc)
    monday = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return monday, sunday


# ── Upsert helpers ──────────────────────────────────────────────────────────

def upsert_team(t: dict, game: str) -> Optional[str]:
    ps_id = t.get("id")
    name = t.get("name")
    if not name:
        return None
    acronym = t.get("acronym") or name[:4].upper()
    logo = t.get("image_url")
    location = t.get("location")

    fields = {
        "name": name, "abbrev": acronym, "logo_url": logo,
        "region": location, "game": game,
    }

    # 1. by pandascore_id
    row = sb.table("teams").select("id").eq("pandascore_id", ps_id).execute()
    if row.data:
        sb.table("teams").update(fields).eq("pandascore_id", ps_id).execute()
        return row.data[0]["id"]

    # 2. by abbrev (catches seed-data teams)
    row = sb.table("teams").select("id").eq("abbrev", acronym).execute()
    if row.data:
        sb.table("teams").update({**fields, "pandascore_id": ps_id}).eq("abbrev", acronym).execute()
        return row.data[0]["id"]

    # 3. by name
    row = sb.table("teams").select("id").eq("name", name).execute()
    if row.data:
        sb.table("teams").update({**fields, "pandascore_id": ps_id}).eq("name", name).execute()
        return row.data[0]["id"]

    # 4. insert
    res = sb.table("teams").insert({
        **fields, "pandascore_id": ps_id,
        "color": DEFAULT_COLORS.get(game, "#666"),
    }).execute()
    return res.data[0]["id"] if res.data else None


def upsert_player(p: dict, team_uuid: Optional[str], game: str) -> Optional[str]:
    ps_id = p.get("id")
    ign = p.get("name") or p.get("slug", "Unknown")
    first = p.get("first_name") or ""
    last = p.get("last_name") or ""
    full_name = f"{first} {last}".strip() or ign
    photo = p.get("image_url")
    role = p.get("role")

    fields = {
        "name": full_name, "ign": ign, "photo_url": photo,
        "role": role, "team_id": team_uuid, "game": game,
    }

    # by pandascore_id
    row = sb.table("players").select("id").eq("pandascore_id", ps_id).execute()
    if row.data:
        sb.table("players").update(fields).eq("pandascore_id", ps_id).execute()
        return row.data[0]["id"]

    # by ign + team (catches seed players)
    if team_uuid:
        row = sb.table("players").select("id").eq("ign", ign).eq("team_id", team_uuid).execute()
        if row.data:
            sb.table("players").update({**fields, "pandascore_id": ps_id}).eq("id", row.data[0]["id"]).execute()
            return row.data[0]["id"]

    res = sb.table("players").insert({**fields, "pandascore_id": ps_id}).execute()
    return res.data[0]["id"] if res.data else None


def upsert_match(m: dict, team_a: str, team_b: str,
                 game: str, event_uuid: Optional[str] = None) -> Optional[str]:
    ps_id = m.get("id")
    start = m.get("scheduled_at") or m.get("begin_at")
    status_raw = m.get("status", "not_started")
    bo = m.get("number_of_games", 3)
    status_map = {
        "not_started": "upcoming", "running": "live",
        "finished": "COMPLETED", "canceled": "CANCELED", "postponed": "upcoming",
    }
    status = status_map.get(status_raw, "upcoming")

    fields = {
        "team_a_id": team_a, "team_b_id": team_b,
        "start_time": start, "status": status, "game": game,
        "series_format": f"BO{bo}", "event_id": event_uuid,
    }

    row = sb.table("matches").select("id").eq("pandascore_id", ps_id).execute()
    if row.data:
        sb.table("matches").update(fields).eq("pandascore_id", ps_id).execute()
        return row.data[0]["id"]

    res = sb.table("matches").insert({**fields, "pandascore_id": ps_id}).execute()
    return res.data[0]["id"] if res.data else None


def ensure_prop_type(name: str) -> str:
    if name in _prop_type_cache:
        return _prop_type_cache[name]
    row = sb.table("prop_types").select("id").eq("name", name).execute()
    if row.data:
        _prop_type_cache[name] = row.data[0]["id"]
        return _prop_type_cache[name]
    res = sb.table("prop_types").insert({"name": name}).execute()
    _prop_type_cache[name] = res.data[0]["id"]
    return _prop_type_cache[name]


def create_prop_lines(match_uuid: str, player_uuid: str, ign: str, game: str):
    templates = STAT_TEMPLATES.get(game, STAT_TEMPLATES["valorant"])
    for tmpl in templates:
        prop_name = tmpl["prop"]
        pt_id = ensure_prop_type(prop_name)

        exists = (
            sb.table("prop_lines").select("id")
            .eq("match_id", match_uuid)
            .eq("player_id", player_uuid)
            .eq("prop_type_id", pt_id)
            .execute()
        )
        if exists.data:
            continue

        h = int(hashlib.md5(f"{ign}:{prop_name}".encode()).hexdigest(), 16)
        offset = ((h % 100) - 50) / 50.0
        line = round_half(tmpl["mean"] + offset * tmpl["std"])

        sb.table("prop_lines").insert({
            "match_id": match_uuid,
            "player_id": player_uuid,
            "prop_type_id": pt_id,
            "line_value": float(line),
            "ml_confidence": det_confidence(ign, prop_name),
            "ml_direction": det_direction(ign, prop_name),
            "status": "OPEN",
        }).execute()


# ── Phase 1: Fetch matches from PandaScore ──────────────────────────────────

def fetch_week_matches(prefix: str, league_id: int, week_end_iso: str) -> list:
    """Fetch running + upcoming matches for one league."""
    running = api_get(f"/{prefix}/matches/running", {
        "filter[league_id]": league_id,
        "per_page": 20,
    }) or []
    upcoming = api_get(f"/{prefix}/matches/upcoming", {
        "filter[league_id]": league_id,
        "per_page": 50,
        "sort": "begin_at",
    }) or []
    return running + upcoming


# ── Phase 2: Batch-fetch all team rosters ────────────────────────────────────

def prefetch_rosters(team_ps_ids: List[int]):
    """Fetch roster for every team we haven't cached yet."""
    to_fetch = [tid for tid in team_ps_ids if tid not in _team_roster_cache]
    if not to_fetch:
        return
    print(f"  Fetching rosters for {len(to_fetch)} teams…")
    for i, tid in enumerate(to_fetch):
        detail = api_get(f"/teams/{tid}")
        if isinstance(detail, dict):
            _team_roster_cache[tid] = detail.get("players") or []
        elif isinstance(detail, list) and detail:
            _team_roster_cache[tid] = detail[0].get("players") or []
        else:
            _team_roster_cache[tid] = []
        if (i + 1) % 10 == 0:
            print(f"    {i + 1}/{len(to_fetch)} teams fetched…")
    total_players = sum(len(v) for v in _team_roster_cache.values())
    print(f"  ✓ Rosters cached ({total_players} players across {len(_team_roster_cache)} teams)")


# ── Phase 3: Sync one league ────────────────────────────────────────────────

def sync_league(key: str, cfg: dict, week_start: datetime, week_end: datetime) -> int:
    prefix = cfg["prefix"]
    db_game = cfg["db_game"]
    league_id = cfg["league_id"]
    label = cfg["label"]

    print(f"\n{'=' * 60}")
    print(f"  {label}  •  {week_start.strftime('%b %d')} – {week_end.strftime('%b %d')}")
    print(f"{'=' * 60}")

    # Phase 1 — fetch matches
    raw = fetch_week_matches(prefix, league_id, week_end.strftime("%Y-%m-%dT%H:%M:%SZ"))

    # Filter to this week only + must have 2 opponents
    matches = []
    ws = week_start.strftime("%Y-%m-%dT%H:%M:%S")
    we = week_end.strftime("%Y-%m-%dT%H:%M:%S")
    for m in raw:
        if len(m.get("opponents") or []) < 2:
            continue
        if m.get("status") == "running":
            matches.append(m)
            continue
        sched = (m.get("scheduled_at") or m.get("begin_at") or "")[:19]
        if sched and ws <= sched <= we:
            matches.append(m)

    print(f"  {len(matches)} matches this week")
    if not matches:
        return 0

    # Phase 2 — batch-fetch rosters for all teams in these matches
    team_ids: set = set()
    for m in matches:
        for opp in m.get("opponents", []):
            tid = opp.get("opponent", {}).get("id")
            if tid:
                team_ids.add(tid)
    prefetch_rosters(list(team_ids))

    # Phase 3 — upsert everything
    synced = 0
    for m in matches:
        opps = m["opponents"]
        ta_raw = opps[0]["opponent"]
        tb_raw = opps[1]["opponent"]

        ta_uuid = upsert_team(ta_raw, db_game)
        tb_uuid = upsert_team(tb_raw, db_game)
        if not ta_uuid or not tb_uuid:
            continue

        # Event / tournament
        tournament = m.get("tournament")
        event_uuid = None
        if tournament:
            t_ps_id = tournament.get("id")
            league_data = m.get("league") or {}
            t_name = tournament.get("name") or league_data.get("name") or label
            t_start = (tournament.get("begin_at") or "")[:10] or None
            t_end = (tournament.get("end_at") or "")[:10] or None

            ev = sb.table("events").select("id").eq("pandascore_id", t_ps_id).execute()
            if ev.data:
                event_uuid = ev.data[0]["id"]
            else:
                res = sb.table("events").insert({
                    "name": t_name, "start_date": t_start,
                    "end_date": t_end, "pandascore_id": t_ps_id,
                }).execute()
                event_uuid = res.data[0]["id"] if res.data else None

        match_uuid = upsert_match(m, ta_uuid, tb_uuid, db_game, event_uuid)
        if not match_uuid:
            continue

        # Players + prop lines
        for t_raw, t_uuid in [(ta_raw, ta_uuid), (tb_raw, tb_uuid)]:
            roster = _team_roster_cache.get(t_raw.get("id"), [])
            for p in roster:
                p_uuid = upsert_player(p, t_uuid, db_game)
                if not p_uuid:
                    continue
                ign = p.get("name") or p.get("slug") or "Unknown"
                create_prop_lines(match_uuid, p_uuid, ign, db_game)

        synced += 1
        name = m.get("name") or f"{ta_raw.get('name')} vs {tb_raw.get('name')}"
        print(f"  ✓ {name}  ({m.get('status', '?')})")

    print(f"  Synced {synced} {label} matches")
    return synced


# ── Entry point ─────────────────────────────────────────────────────────────

def main():
    week_start, week_end = week_bounds()

    print("╔═══════════════════════════════════════════════════════════╗")
    print("║  Kimi — Weekly Pro Match Sync  (VCT + CDL only)         ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"  Week: {week_start.strftime('%a %b %d')} → {week_end.strftime('%a %b %d')}")

    total = 0
    for key, cfg in LEAGUES.items():
        try:
            total += sync_league(key, cfg, week_start, week_end)
        except Exception as e:
            print(f"\n  ✗ ERROR syncing {cfg['label']}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'=' * 60}")
    print(f"  DONE — {total} pro matches synced")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
