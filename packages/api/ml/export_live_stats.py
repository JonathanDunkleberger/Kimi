"""
Export live Chronicle stats from VLR + Breaking Point + VCT historical CSVs.

Writes:
  packages/api/ml/data/live_stats.json
  packages/web/src/lib/demo/live_stats.json
  packages/web/public/data/live_stats.json

Usage (from repo root or this directory):
  python packages/api/ml/export_live_stats.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
HIST_DIR = DATA_DIR / "Val-historical-stats"
OUT_API = DATA_DIR / "live_stats.json"
OUT_WEB_DEMO = ML_DIR.parent.parent / "web" / "src" / "lib" / "demo" / "live_stats.json"
OUT_WEB_PUBLIC = ML_DIR.parent.parent / "web" / "public" / "data" / "live_stats.json"

# Ensure local imports work when invoked as a script.
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

from bp_scraper import get_cod_leaderboard  # noqa: E402
from vlr_scraper import (  # noqa: E402
    enrich_image_urls,
    get_stats_leaderboard,
    get_watchlist_players,
)


def _slug(name: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")


def load_vct_history(min_maps_equiv: int = 20, limit: int = 120) -> List[Dict[str, Any]]:
    """
    Aggregate career-style rolls from local VCT players_stats CSVs.

    To avoid double-counting per-agent + series rows, for each
    (year, tournament, stage, match_type, player) we keep the row with
    the most rounds played (typically the multi-agent aggregate).
    """
    files = list(HIST_DIR.glob("vct_*/players_stats/players_stats.csv"))
    if not files:
        print("[hist] no VCT CSVs found", file=sys.stderr)
        return []

    frames = []
    for f in files:
        try:
            year = None
            for part in f.parts:
                if part.startswith("vct_"):
                    year = int(part.split("_")[1])
            df = pd.read_csv(f)
            df["__year"] = year
            frames.append(df)
        except Exception as e:
            print(f"[hist] skip {f}: {e}", file=sys.stderr)

    if not frames:
        return []

    df = pd.concat(frames, ignore_index=True)
    # Normalize columns
    colmap = {
        "Tournament": "tournament",
        "Stage": "stage",
        "Match Type": "match_type",
        "Player": "player",
        "Teams": "team",
        "Rounds Played": "rounds",
        "Rating": "rating",
        "Average Combat Score": "acs",
        "Kills": "kills",
        "Deaths": "deaths",
        "Assists": "assists",
        "Headshot %": "hs",
    }
    for src, dst in colmap.items():
        if src in df.columns and dst not in df.columns:
            df[dst] = df[src]

    need = ["player", "rounds", "kills", "deaths", "assists", "rating"]
    for c in need:
        if c not in df.columns:
            print(f"[hist] missing column {c}", file=sys.stderr)
            return []

    for c in ["rounds", "kills", "deaths", "assists", "rating", "acs"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    if "hs" in df.columns:
        df["hs"] = (
            df["hs"]
            .astype(str)
            .str.replace("%", "", regex=False)
            .pipe(pd.to_numeric, errors="coerce")
        )

    group_keys = ["__year", "tournament", "stage", "match_type", "player"]
    for k in group_keys:
        if k not in df.columns:
            df[k] = ""

    # Keep max-rounds row per match/player to drop agent duplicates.
    df = df.sort_values("rounds", ascending=False)
    df = df.drop_duplicates(subset=group_keys, keep="first")

    # Career rolls
    named = {
        "rounds": ("rounds", "sum"),
        "kills": ("kills", "sum"),
        "deaths": ("deaths", "sum"),
        "assists": ("assists", "sum"),
        "rating": ("rating", "mean"),
    }
    if "acs" in df.columns:
        named["acs"] = ("acs", "mean")
    if "hs" in df.columns:
        named["hs"] = ("hs", "mean")
    if "team" in df.columns:
        named["team"] = ("team", "last")
    agg = df.groupby("player", as_index=False).agg(**named)
    if "acs" not in agg.columns:
        agg["acs"] = None
    if "hs" not in agg.columns:
        agg["hs"] = None
    if "team" not in agg.columns:
        agg["team"] = "VCT"

    # Approximate maps from rounds (~22/map average)
    agg["maps"] = (agg["rounds"] / 22).round().astype(int)
    agg = agg[agg["maps"] >= min_maps_equiv]
    agg = agg.sort_values(["maps", "rating"], ascending=[False, False]).head(limit)

    out: List[Dict[str, Any]] = []
    for _, r in agg.iterrows():
        name = str(r["player"]).strip()
        if not name or name.lower() == "nan":
            continue
        team = str(r.get("team") or "").split(",")[0].strip()
        hs_val = r.get("hs")
        acs_val = r.get("acs")
        out.append(
            {
                "playerId": f"val-hist-{_slug(name)}",
                "name": name,
                "team": team or "VCT",
                "game": "VALORANT",
                "imageUrl": "",
                "maps": int(r["maps"]),
                "kills": int(r["kills"] or 0),
                "deaths": int(r["deaths"] or 0),
                "assists": int(r["assists"] or 0),
                "rating": round(float(r["rating"] or 0), 3),
                "acs": int(round(float(acs_val))) if pd.notna(acs_val) and acs_val == acs_val else None,
                "hsPercent": round(float(hs_val), 1) if pd.notna(hs_val) and hs_val == hs_val else None,
                "source": "vct_history",
            }
        )

    print(f"[hist] career rows={len(out)} from {len(files)} files", file=sys.stderr)
    return out


def _is_blank(v: Any) -> bool:
    if v is None or v == "" or v == []:
        return True
    return False


def _stat_score(p: Dict[str, Any]) -> tuple:
    """Higher = prefer as the primary stats row (avoid zeroed watchlist stubs)."""
    priority = {"vlr": 3, "breakingpoint": 3, "vct_history": 2}
    maps = int(p.get("maps") or 0)
    kills = int(p.get("kills") or 0)
    rating = float(p.get("rating") or 0)
    # Prefer any real volume, then most maps (career archive beats thin 90d samples).
    return (1 if maps > 0 or kills > 0 else 0, maps, priority.get(p.get("source") or "", 0), rating)


def _merge_players(*groups: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge by lowercase name + game; keep best stats and fill blanks (esp. images)."""
    by_key: Dict[str, Dict[str, Any]] = {}

    for group in groups:
        for p in group:
            key = f"{p.get('game')}|{(p.get('name') or '').strip().lower()}"
            if not p.get("name"):
                continue
            existing = by_key.get(key)
            if not existing:
                by_key[key] = dict(p)
                continue

            if _stat_score(p) >= _stat_score(existing):
                base, other = p, existing
            else:
                base, other = existing, p

            merged = dict(base)
            for k, v in other.items():
                if _is_blank(merged.get(k)) and not _is_blank(v):
                    merged[k] = v
            # Always prefer a real image when available
            if other.get("imageUrl") and not merged.get("imageUrl"):
                merged["imageUrl"] = other["imageUrl"]
            # Prefer canonical numeric player ids over hist slugs when both exist
            pid = merged.get("playerId") or ""
            other_pid = other.get("playerId") or ""
            if pid.startswith("val-hist-") and other_pid.startswith("val-") and not other_pid.startswith("val-hist-"):
                merged["playerId"] = other_pid
            by_key[key] = merged

    players = list(by_key.values())
    players.sort(key=lambda x: float(x.get("rating") or 0), reverse=True)
    return players


def export(skip_network: bool = False) -> Dict[str, Any]:
    sources: List[str] = []
    hist = load_vct_history()
    if hist:
        sources.append("vct_history")

    vlr_rows: List[Dict[str, Any]] = []
    watch: List[Dict[str, Any]] = []
    cod: List[Dict[str, Any]] = []

    if not skip_network:
        try:
            vlr_rows = get_stats_leaderboard(timespan="90d", min_rounds=80, limit=80)
            if vlr_rows:
                sources.append("vlr")
                vlr_rows = enrich_image_urls(vlr_rows, max_fetch=20)
        except Exception as e:
            print(f"[export] vlr leaderboard failed: {e}", file=sys.stderr)

        try:
            watch = get_watchlist_players()
            if watch and "vlr" not in sources:
                sources.append("vlr")
        except Exception as e:
            print(f"[export] vlr watchlist failed: {e}", file=sys.stderr)

        try:
            cod = get_cod_leaderboard(limit=60)
            if cod:
                sources.append("breakingpoint")
        except Exception as e:
            print(f"[export] bp failed: {e}", file=sys.stderr)

    players = _merge_players(hist, vlr_rows, watch, cod)

    # Strip helper fields
    clean = []
    for p in players:
        clean.append(
            {
                "playerId": p.get("playerId"),
                "name": p.get("name"),
                "team": p.get("team") or "",
                "game": p.get("game"),
                "imageUrl": p.get("imageUrl") or "",
                "maps": int(p.get("maps") or 0),
                "kills": int(p.get("kills") or 0),
                "deaths": int(p.get("deaths") or 0),
                "assists": int(p.get("assists") or 0),
                "rating": float(p.get("rating") or 0),
                "acs": p.get("acs"),
                "damage": p.get("damage"),
                "hsPercent": p.get("hsPercent"),
                "source": p.get("source") or "unknown",
            }
        )

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
        "players": clean,
    }
    return payload


def write_payload(payload: Dict[str, Any]) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    for path in (OUT_API, OUT_WEB_DEMO, OUT_WEB_PUBLIC):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print(f"[export] wrote {path} ({len(payload['players'])} players)", file=sys.stderr)


def main(argv: Optional[List[str]] = None) -> int:
    argv = argv or sys.argv[1:]
    skip = "--offline" in argv
    payload = export(skip_network=skip)
    if not payload["players"]:
        print("[export] WARNING: no players exported", file=sys.stderr)
    write_payload(payload)
    print(json.dumps({"updatedAt": payload["updatedAt"], "sources": payload["sources"], "count": len(payload["players"])}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
