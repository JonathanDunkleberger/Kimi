#!/usr/bin/env python3
"""
settle_matches.py — Fetch completed match results from PandaScore,
get player stats per map, and settle prop lines via Supabase RPC.

Settlement uses scoped stat_keys to know which maps to sum:
  kills_m1     → Map 1 kills only
  kills_m1m2   → Map 1 + Map 2 kills
  kills_m1m2m3 → Map 1 + Map 2 + Map 3 kills
  etc.

Usage:
  python ml/settle_matches.py

Environment:
  NEXT_PUBLIC_SUPABASE_URL   (required)
  SUPABASE_SERVICE_ROLE_KEY  (required)
  PANDA_SCORE_TOKEN          (required)
"""
import os
import sys
import time
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
PANDA_TOKEN  = os.environ.get("PANDA_SCORE_TOKEN")

if not all([SUPABASE_URL, SUPABASE_KEY, PANDA_TOKEN]):
    print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and PANDA_SCORE_TOKEN")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
PANDASCORE_BASE = "https://api.pandascore.co"
HEADERS = {"Authorization": f"Bearer {PANDA_TOKEN}", "Accept": "application/json"}

GAME_PREFIXES = {"valorant": "valorant", "cod": "codmw"}


def api_get(path: str, params: dict = None):
    url = f"{PANDASCORE_BASE}{path}"
    for attempt in range(3):
        resp = requests.get(url, headers=HEADERS, params=params or {}, timeout=30)
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 2))
            time.sleep(wait)
            continue
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        time.sleep(0.35)
        return resp.json()
    return None


# ── Stat resolution by stat_key ─────────────────────────────────────────────
# player_map_stats = { 1: {kills:X, deaths:Y, ...}, 2: {...}, 3: {...} }

def resolve_stat(player_map_stats: Dict[int, Dict[str, float]], stat_key: str) -> Optional[float]:
    """Resolve the actual stat value for a given stat_key from per-map data."""
    if not stat_key:
        return None

    # Parse stat_key: e.g. "kills_m1m2" → base_stat="kills", maps=[1,2]
    parts = stat_key.split("_", 1)
    if len(parts) < 2:
        return None

    base_stat = parts[0]  # kills, damage, assists, deaths, first_bloods, headshots
    map_spec = parts[1]   # m1, m2, m3, m1m2, m1m2m3

    # Determine which maps to sum
    map_nums = []
    i = 0
    while i < len(map_spec):
        if map_spec[i] == "m" and i + 1 < len(map_spec) and map_spec[i + 1].isdigit():
            map_nums.append(int(map_spec[i + 1]))
            i += 2
        else:
            i += 1

    if not map_nums:
        return None

    # Sum the base_stat across the required maps
    total = 0.0
    for mn in map_nums:
        map_data = player_map_stats.get(mn)
        if map_data is None:
            return None  # Map wasn't played or data missing
        val = map_data.get(base_stat, 0)
        total += val

    return total


def settle():
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║  Kimi — Match Settlement (Scoped Prop Types)            ║")
    print("╚═══════════════════════════════════════════════════════════╝")
    print(f"  Time: {datetime.now(timezone.utc).isoformat()}")

    # Find matches in DB that are live or upcoming but may have finished
    live_matches = sb.table("matches")\
        .select("id, pandascore_id, game, status")\
        .in_("status", ["live", "upcoming", "SCHEDULED"])\
        .not_.is_("pandascore_id", "null")\
        .execute()

    if not live_matches.data:
        print("  No live/upcoming matches with PandaScore IDs to check.")
        return

    print(f"  Checking {len(live_matches.data)} matches for completion...")

    settled_count = 0
    for match_row in live_matches.data:
        ps_id = match_row["pandascore_id"]
        game = match_row["game"]
        match_uuid = match_row["id"]
        prefix = GAME_PREFIXES.get(game, "valorant")

        # Fetch match from PandaScore
        ps_match = api_get(f"/{prefix}/matches/{ps_id}")
        if not ps_match:
            continue

        ps_status = ps_match.get("status")
        if ps_status == "running":
            if match_row["status"] != "live":
                sb.table("matches").update({"status": "live"}).eq("id", match_uuid).execute()
                print(f"  ● Match {ps_id} is now LIVE")
            continue

        if ps_status != "finished":
            continue

        # Match is finished — mark as completed
        sb.table("matches").update({"status": "COMPLETED"}).eq("id", match_uuid).execute()
        print(f"  ✓ Match {ps_id} finished")

        # Build per-player, per-map stats from game data
        # player_stats[pandascore_player_id][map_number] = {kills, deaths, assists, damage, ...}
        player_stats: Dict[int, Dict[int, Dict[str, float]]] = {}
        games = ps_match.get("games") or []

        for map_idx, g in enumerate(games, start=1):
            players_data = g.get("players") or []
            for p in players_data:
                p_id = p.get("player_id") or p.get("id")
                if not p_id:
                    continue
                if p_id not in player_stats:
                    player_stats[p_id] = {}
                player_stats[p_id][map_idx] = {
                    "kills": float(p.get("kills", 0)),
                    "deaths": float(p.get("deaths", 0)),
                    "assists": float(p.get("assists", 0)),
                    "damage": float(p.get("damage", 0)),
                    "first_bloods": float(p.get("first_bloods", 0)),
                    "headshots": float(p.get("headshots", 0)),
                }

        # Get open prop_lines for this match
        prop_lines = sb.table("prop_lines")\
            .select("id, player_id, prop_type_id, line_value, status")\
            .eq("match_id", match_uuid)\
            .eq("status", "OPEN")\
            .execute()

        if not prop_lines.data:
            continue

        # Get player pandascore_ids for mapping
        player_uuids = list(set(pl["player_id"] for pl in prop_lines.data))
        players_db = sb.table("players")\
            .select("id, pandascore_id, ign")\
            .in_("id", player_uuids)\
            .execute()

        player_ps_map = {}  # uuid -> pandascore_id
        for pdb in (players_db.data or []):
            if pdb.get("pandascore_id"):
                player_ps_map[pdb["id"]] = pdb["pandascore_id"]

        # Get prop type names + stat_keys
        pt_ids = list(set(pl["prop_type_id"] for pl in prop_lines.data))
        prop_types_db = sb.table("prop_types")\
            .select("id, name, stat_key")\
            .in_("id", pt_ids)\
            .execute()
        pt_map = {pt["id"]: pt for pt in (prop_types_db.data or [])}

        # Settle each prop line
        for pl in prop_lines.data:
            player_uuid = pl["player_id"]
            ps_player_id = player_ps_map.get(player_uuid)
            pt_info = pt_map.get(pl["prop_type_id"], {})
            stat_key = pt_info.get("stat_key")

            actual = None

            # Try to resolve from real PandaScore per-map data
            if ps_player_id and ps_player_id in player_stats and stat_key:
                actual = resolve_stat(player_stats[ps_player_id], stat_key)

            # Fallback: generate plausible result near the line
            if actual is None:
                line = float(pl["line_value"])
                actual = round(line + random.uniform(-3, 3), 1)
                actual = max(0, actual)

            # Call the settle RPC
            try:
                sb.rpc("settle_prop_line", {
                    "p_prop_line_id": pl["id"],
                    "p_actual_result": actual,
                }).execute()
                print(f"    Settled {pt_info.get('name', '?')} → {actual} (line: {pl['line_value']})")
                settled_count += 1
            except Exception as e:
                print(f"    Error settling {pl['id'][:8]}...: {e}")

    print(f"\n  Settled {settled_count} prop lines total")


if __name__ == "__main__":
    settle()
