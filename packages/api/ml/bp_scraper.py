"""Breaking Point.gg Call of Duty stats scraper.

Uses the public Next.js tRPC endpoint plus the public Supabase anon key
(already embedded in BP's client bundle) for player/team metadata.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
from typing import Any, Dict, List, Optional

from http_util import DEFAULT_UA, get, session

BP_ORIGIN = "https://www.breakingpoint.gg"
SUPABASE_URL = "https://dfpiiufxcciujugzjvgx.supabase.co"
TRPC_PROC = "playerStats.getAggregatedOrderedPlayerStats"


def _extract_supabase_anon_key(html_or_js: str) -> Optional[str]:
    keys = re.findall(r"eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+", html_or_js)
    return keys[0] if keys else None


def _discover_anon_key(sess) -> Optional[str]:
    """Pull the public anon JWT from BP's frontend chunk (same key every visitor gets)."""
    try:
        page = get(f"{BP_ORIGIN}/stats", sess=sess, timeout=30)
        # Prefer the known chunk that embeds the key; fall back to scanning page scripts.
        chunk_urls = re.findall(r"/_next/static/chunks/[a-f0-9]+\.js", page.text)
        candidates = []
        for path in chunk_urls:
            if path not in candidates:
                candidates.append(path)
        # Also try a few high-signal chunks first by fetching buildManifest is overkill —
        # scan until we find a JWT.
        for path in candidates[:40]:
            try:
                js = get(f"{BP_ORIGIN}{path}", sess=sess, timeout=20).text
            except Exception:
                continue
            key = _extract_supabase_anon_key(js)
            if key and len(key) > 100:
                return key
    except Exception as e:
        print(f"[bp] anon key discovery failed: {e}", file=sys.stderr)
    return None


def _current_season_id(sess) -> int:
    try:
        page = get(f"{BP_ORIGIN}/stats", sess=sess, timeout=30)
        m = re.search(
            r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page.text, re.S
        )
        if not m:
            return 2026
        data = json.loads(m.group(1))
        seasons = data["props"]["pageProps"].get("allSeasons") or []
        if not seasons:
            return 2026
        # Prefer highest year / id.
        seasons = sorted(seasons, key=lambda s: s.get("id") or 0, reverse=True)
        return int(seasons[0]["id"])
    except Exception as e:
        print(f"[bp] season detect failed, defaulting 2026: {e}", file=sys.stderr)
        return 2026


def _trpc_aggregated(sess, season_id: int) -> List[Dict[str, Any]]:
    payload = {"json": {"seasonId": season_id}}
    q = urllib.parse.quote(json.dumps(payload, separators=(",", ":")))
    url = f"{BP_ORIGIN}/api/trpc/{TRPC_PROC}?input={q}"
    resp = get(url, sess=sess, timeout=45)
    body = resp.json()
    rows = body.get("result", {}).get("data", {}).get("json") or []
    return rows if isinstance(rows, list) else []


def _supabase_headers(anon_key: str) -> Dict[str, str]:
    return {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "User-Agent": DEFAULT_UA,
        "Accept": "application/json",
    }


def _fetch_player_meta(sess, anon_key: str, player_ids: List[int]) -> Dict[int, Dict]:
    """id -> {tag, current_team_id, headshot}"""
    out: Dict[int, Dict] = {}
    if not player_ids:
        return out
    # Supabase REST caps URL length; batch.
    headers = _supabase_headers(anon_key)
    for i in range(0, len(player_ids), 80):
        batch = player_ids[i : i + 80]
        ids = ",".join(str(x) for x in batch)
        url = (
            f"{SUPABASE_URL}/rest/v1/players"
            f"?select=id,tag,current_team_id,headshot&id=in.({ids})"
        )
        try:
            resp = get(url, sess=sess, headers=headers, timeout=30)
            for row in resp.json():
                out[int(row["id"])] = row
        except Exception as e:
            print(f"[bp] players meta batch failed: {e}", file=sys.stderr)
    return out


def _fetch_teams(sess, anon_key: str, team_ids: List[int]) -> Dict[int, str]:
    out: Dict[int, str] = {}
    if not team_ids:
        return out
    headers = _supabase_headers(anon_key)
    for i in range(0, len(team_ids), 80):
        batch = team_ids[i : i + 80]
        ids = ",".join(str(x) for x in batch)
        url = f"{SUPABASE_URL}/rest/v1/teams?select=id,name&id=in.({ids})"
        try:
            resp = get(url, sess=sess, headers=headers, timeout=30)
            for row in resp.json():
                out[int(row["id"])] = row.get("name") or "CDL"
        except Exception as e:
            print(f"[bp] teams batch failed: {e}", file=sys.stderr)
    return out


def get_cod_leaderboard(limit: int = 80) -> List[Dict[str, Any]]:
    """
    Return DemoStatRow-compatible COD player dicts from Breaking Point.
    Fail-soft: returns [] on total failure.
    """
    sess = session()
    try:
        season_id = _current_season_id(sess)
        rows = _trpc_aggregated(sess, season_id)
        if not rows:
            print("[bp] empty aggregated stats", file=sys.stderr)
            return []

        active = [r for r in rows if (r.get("game_count") or 0) > 0]
        active.sort(key=lambda r: float(r.get("bp_rating") or 0), reverse=True)
        active = active[:limit]

        player_ids = [int(r["player_id"]) for r in active if r.get("player_id") is not None]
        anon = _discover_anon_key(sess)
        meta: Dict[int, Dict] = {}
        teams: Dict[int, str] = {}
        if anon:
            meta = _fetch_player_meta(sess, anon, player_ids)
            team_ids = sorted(
                {
                    int(m["current_team_id"])
                    for m in meta.values()
                    if m.get("current_team_id") is not None
                }
            )
            teams = _fetch_teams(sess, anon, team_ids)
        else:
            print("[bp] no anon key — team/avatar metadata limited", file=sys.stderr)

        out: List[Dict[str, Any]] = []
        for r in active:
            pid = int(r["player_id"])
            m = meta.get(pid) or {}
            name = (m.get("tag") or r.get("player_tag") or f"Player{pid}").strip()
            team_id = m.get("current_team_id")
            team = teams.get(int(team_id), "CDL") if team_id is not None else "CDL"
            headshot = m.get("headshot") or ""
            kills = int(r.get("kills") or 0)
            deaths = int(r.get("deaths") or 0)
            assists = int(r.get("assists") or 0)
            maps = int(r.get("game_count") or 0)
            rating = float(r.get("bp_rating") or 0)
            damage = int(r.get("damage") or 0)
            # Approximate HS% not published on aggregated rows — omit.
            out.append(
                {
                    "playerId": f"cod-{pid}",
                    "name": name,
                    "team": team,
                    "game": "COD",
                    "imageUrl": headshot,
                    "maps": maps,
                    "kills": kills,
                    "deaths": deaths,
                    "assists": assists,
                    "rating": round(rating, 3),
                    "damage": damage,
                    "source": "breakingpoint",
                }
            )
        print(f"[bp] scraped {len(out)} COD players (season {season_id})", file=sys.stderr)
        return out
    except Exception as e:
        print(f"[bp] scrape failed: {e}", file=sys.stderr)
        return []


if __name__ == "__main__":
    for row in get_cod_leaderboard(10):
        print(json.dumps(row))
