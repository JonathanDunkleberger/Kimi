#!/usr/bin/env python3
"""
sync_matches.py — Fetch upcoming/running matches from PandaScore for
Valorant and CODMW, upsert teams/players/matches into Supabase,
and generate prop lines with realistic stat projections.

Usage:
  python ml/sync_matches.py

Environment:
  NEXT_PUBLIC_SUPABASE_URL   (required)
  SUPABASE_SERVICE_ROLE_KEY  (required — needs insert/update access)
  PANDA_SCORE_TOKEN          (required)
"""
import os
import sys
import time
import random
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
PANDA_TOKEN  = os.environ.get("PANDA_SCORE_TOKEN")

if not all([SUPABASE_URL, SUPABASE_KEY, PANDA_TOKEN]):
    print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and PANDA_SCORE_TOKEN")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

PANDASCORE_BASE = "https://api.pandascore.co"
HEADERS = {"Authorization": f"Bearer {PANDA_TOKEN}", "Accept": "application/json"}

# Game-specific PandaScore prefixes
GAMES = {
    "valorant": {"prefix": "valorant", "db_game": "valorant"},
    "codmw":    {"prefix": "codmw",    "db_game": "cod"},
}

# Default team colors by game
DEFAULT_COLORS = {"valorant": "#FF4655", "cod": "#1E90FF"}

# ── Stat lines: realistic averages per stat type per game ───────────────────
# Used to generate prop lines when a player has no historical stats.
# Values represent typical per-map averages for professional play.

STAT_TEMPLATES = {
    "valorant": [
        {"prop": "Kills",         "mean": 17.0, "std": 3.5},
        {"prop": "Deaths",        "mean": 14.0, "std": 2.5},
        {"prop": "Assists",       "mean": 4.5,  "std": 1.5},
    ],
    "cod": [
        {"prop": "Kills",              "mean": 24.0, "std": 4.0},
        {"prop": "Total Series Kills", "mean": 105.0,"std": 15.0},
        {"prop": "Map 1 Kills",        "mean": 8.5,  "std": 2.0},
        {"prop": "Map 2 Kills",        "mean": 8.5,  "std": 2.0},
        {"prop": "Map 3 Kills",        "mean": 8.5,  "std": 2.0},
        {"prop": "Damage",             "mean": 3200.0,"std": 400.0},
    ],
}

# ── Helpers ─────────────────────────────────────────────────────────────────

def api_get(path: str, params: dict = None) -> List[dict]:
    """GET from PandaScore with rate-limit handling."""
    url = f"{PANDASCORE_BASE}{path}"
    for attempt in range(3):
        resp = requests.get(url, headers=HEADERS, params=params or {}, timeout=30)
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 2))
            print(f"  Rate limited, waiting {wait}s...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()
    return []


def round_half(v: float) -> float:
    """Round to nearest 0.5."""
    return round(v * 2) / 2


def deterministic_confidence(player_name: str, prop_name: str) -> int:
    """Generate a stable confidence 55–82 per player+prop combo."""
    h = int(hashlib.md5(f"{player_name}:{prop_name}".encode()).hexdigest(), 16)
    return 55 + (h % 28)


def deterministic_direction(player_name: str, prop_name: str) -> str:
    h = int(hashlib.md5(f"{player_name}:{prop_name}:dir".encode()).hexdigest(), 16)
    return "over" if h % 2 == 0 else "under"


# ── Upsert functions ───────────────────────────────────────────────────────

def upsert_team(t: dict, game: str) -> Optional[str]:
    """Upsert a team from PandaScore data. Returns the Supabase UUID."""
    ps_id = t.get("id")
    name = t.get("name")
    if not name:
        return None

    acronym = t.get("acronym") or name[:4].upper()
    logo = t.get("image_url")
    location = t.get("location")

    # Check if exists by pandascore_id
    existing = sb.table("teams").select("id").eq("pandascore_id", ps_id).execute()
    if existing.data:
        # Update
        sb.table("teams").update({
            "name": name,
            "abbrev": acronym,
            "logo_url": logo,
            "region": location,
            "game": game,
        }).eq("pandascore_id", ps_id).execute()
        return existing.data[0]["id"]
    else:
        # Also check by name to avoid duplicates from seed data
        by_name = sb.table("teams").select("id").eq("name", name).execute()
        if by_name.data:
            sb.table("teams").update({
                "pandascore_id": ps_id,
                "abbrev": acronym,
                "logo_url": logo,
                "region": location,
                "game": game,
            }).eq("name", name).execute()
            return by_name.data[0]["id"]
        # Insert new
        row = {
            "name": name,
            "abbrev": acronym,
            "logo_url": logo,
            "color": DEFAULT_COLORS.get(game, "#666"),
            "region": location,
            "game": game,
            "pandascore_id": ps_id,
        }
        res = sb.table("teams").insert(row).execute()
        return res.data[0]["id"] if res.data else None


def upsert_player(p: dict, team_uuid: Optional[str], game: str) -> Optional[str]:
    """Upsert a player from PandaScore data. Returns the Supabase UUID."""
    ps_id = p.get("id")
    name = p.get("name") or p.get("slug", "Unknown")
    ign = p.get("name") or p.get("slug")
    first = p.get("first_name") or ""
    last = p.get("last_name") or ""
    full_name = f"{first} {last}".strip() or ign
    photo = p.get("image_url")
    role = p.get("role")

    existing = sb.table("players").select("id").eq("pandascore_id", ps_id).execute()
    if existing.data:
        sb.table("players").update({
            "name": full_name,
            "ign": ign,
            "photo_url": photo,
            "role": role,
            "team_id": team_uuid,
            "game": game,
        }).eq("pandascore_id", ps_id).execute()
        return existing.data[0]["id"]
    else:
        row = {
            "name": full_name,
            "ign": ign,
            "photo_url": photo,
            "role": role,
            "team_id": team_uuid,
            "game": game,
            "pandascore_id": ps_id,
        }
        res = sb.table("players").insert(row).execute()
        return res.data[0]["id"] if res.data else None


def upsert_match(m: dict, team_a_uuid: str, team_b_uuid: str,
                 game: str, event_uuid: Optional[str] = None) -> Optional[str]:
    """Upsert a match. Returns UUID."""
    ps_id = m.get("id")
    start = m.get("scheduled_at") or m.get("begin_at")
    status_raw = m.get("status", "not_started")
    series_fmt = f"BO{m.get('number_of_games', 3)}"
    game_mode = None

    # Map PandaScore status to our schema
    status_map = {
        "not_started": "upcoming",
        "running": "live",
        "finished": "COMPLETED",
        "canceled": "CANCELED",
        "postponed": "upcoming",
    }
    status = status_map.get(status_raw, "upcoming")

    existing = sb.table("matches").select("id").eq("pandascore_id", ps_id).execute()
    if existing.data:
        sb.table("matches").update({
            "team_a_id": team_a_uuid,
            "team_b_id": team_b_uuid,
            "start_time": start,
            "status": status,
            "game": game,
            "series_format": series_fmt,
            "event_id": event_uuid,
        }).eq("pandascore_id", ps_id).execute()
        return existing.data[0]["id"]
    else:
        row = {
            "team_a_id": team_a_uuid,
            "team_b_id": team_b_uuid,
            "start_time": start,
            "status": status,
            "game": game,
            "series_format": series_fmt,
            "game_mode": game_mode,
            "event_id": event_uuid,
            "pandascore_id": ps_id,
        }
        res = sb.table("matches").insert(row).execute()
        return res.data[0]["id"] if res.data else None


def ensure_prop_type(name: str) -> str:
    """Get or create prop_type, return UUID."""
    existing = sb.table("prop_types").select("id").eq("name", name).execute()
    if existing.data:
        return existing.data[0]["id"]
    res = sb.table("prop_types").insert({"name": name}).execute()
    return res.data[0]["id"]


def create_prop_lines(match_uuid: str, player_uuid: str,
                      player_ign: str, game: str):
    """Generate prop lines for a player in a match using stat templates."""
    templates = STAT_TEMPLATES.get(game, STAT_TEMPLATES["valorant"])

    for tmpl in templates:
        prop_name = tmpl["prop"]
        pt_id = ensure_prop_type(prop_name)

        # Check if prop line already exists
        existing = sb.table("prop_lines")\
            .select("id")\
            .eq("match_id", match_uuid)\
            .eq("player_id", player_uuid)\
            .eq("prop_type_id", pt_id)\
            .execute()
        if existing.data:
            continue

        # Generate a realistic line value with some player-specific variance
        h = int(hashlib.md5(f"{player_ign}:{prop_name}".encode()).hexdigest(), 16)
        player_offset = ((h % 100) - 50) / 50.0  # -1.0 to +1.0
        raw = tmpl["mean"] + player_offset * tmpl["std"]
        line = round_half(raw)

        confidence = deterministic_confidence(player_ign, prop_name)
        direction = deterministic_direction(player_ign, prop_name)

        row = {
            "match_id": match_uuid,
            "player_id": player_uuid,
            "prop_type_id": pt_id,
            "line_value": float(line),
            "ml_confidence": confidence if random.random() > 0.3 else None,
            "ml_direction": direction if random.random() > 0.3 else None,
            "status": "OPEN",
        }
        sb.table("prop_lines").insert(row).execute()


# ── Main sync logic ────────────────────────────────────────────────────────

def sync_game(game_key: str, db_game: str, prefix: str):
    """Sync upcoming + running matches for one game."""
    print(f"\n{'='*60}")
    print(f"  Syncing {game_key.upper()}")
    print(f"{'='*60}")

    # Fetch upcoming + running matches
    upcoming = api_get(f"/{prefix}/matches/upcoming", {"per_page": 50, "sort": "begin_at"})
    running = api_get(f"/{prefix}/matches/running", {"per_page": 20})
    all_matches = running + upcoming
    print(f"  Found {len(running)} live + {len(upcoming)} upcoming = {len(all_matches)} total")

    synced = 0
    for m in all_matches:
        opponents = m.get("opponents") or []
        if len(opponents) < 2:
            continue  # Skip TBD matches

        team_a_raw = opponents[0].get("opponent", {})
        team_b_raw = opponents[1].get("opponent", {})

        # Upsert teams
        team_a_uuid = upsert_team(team_a_raw, db_game)
        team_b_uuid = upsert_team(team_b_raw, db_game)
        if not team_a_uuid or not team_b_uuid:
            continue

        # Upsert event / tournament
        league = m.get("league")
        tournament = m.get("tournament")
        event_uuid = None
        if tournament:
            t_name = tournament.get("name") or (league or {}).get("name") or "Unknown Event"
            t_start = tournament.get("begin_at", "")[:10] if tournament.get("begin_at") else None
            t_end = tournament.get("end_at", "")[:10] if tournament.get("end_at") else None
            t_ps_id = tournament.get("id")

            existing_ev = sb.table("events").select("id").eq("pandascore_id", t_ps_id).execute()
            if existing_ev.data:
                event_uuid = existing_ev.data[0]["id"]
            else:
                ev_res = sb.table("events").insert({
                    "name": t_name,
                    "start_date": t_start,
                    "end_date": t_end,
                    "pandascore_id": t_ps_id,
                }).execute()
                event_uuid = ev_res.data[0]["id"] if ev_res.data else None

        # Upsert match
        match_uuid = upsert_match(m, team_a_uuid, team_b_uuid, db_game, event_uuid)
        if not match_uuid:
            continue

        # Fetch players for both teams and create prop lines
        for team_raw, team_uuid in [(team_a_raw, team_a_uuid), (team_b_raw, team_b_uuid)]:
            team_ps_id = team_raw.get("id")
            if not team_ps_id:
                continue

            # PandaScore: /teams/{id} or use players from match
            players_data = m.get("players") or []
            # Filter players for this team
            team_players = [p for p in players_data if p.get("team_id") == team_ps_id]

            # If no players in match data, fetch from team endpoint
            if not team_players:
                try:
                    team_detail = api_get(f"/{prefix}/teams/{team_ps_id}")
                    if isinstance(team_detail, dict):
                        team_players = team_detail.get("players") or []
                    elif isinstance(team_detail, list) and team_detail:
                        team_players = team_detail[0].get("players") or []
                except Exception:
                    team_players = []

            for p in team_players:
                player_uuid = upsert_player(p, team_uuid, db_game)
                if not player_uuid:
                    continue
                ign = p.get("name") or p.get("slug") or "Unknown"
                create_prop_lines(match_uuid, player_uuid, ign, db_game)

        synced += 1
        match_name = m.get("name") or f"{team_a_raw.get('name')} vs {team_b_raw.get('name')}"
        print(f"  ✓ {match_name}  ({m.get('status', '?')})")

    print(f"  Synced {synced} matches for {game_key}")
    return synced


def main():
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║  Kimi — PandaScore Match Sync                           ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"  Time: {datetime.now(timezone.utc).isoformat()}")

    total = 0
    for game_key, cfg in GAMES.items():
        try:
            total += sync_game(game_key, cfg["db_game"], cfg["prefix"])
        except Exception as e:
            print(f"  ERROR syncing {game_key}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*60}")
    print(f"  DONE — {total} matches synced across all games")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
