"""Scrape upcoming Valorant matches from vlr.gg using Playwright.

Requires installation:
  pip install playwright
  playwright install chromium

Usage (async):
  from scraper import fetch_upcoming_matches
  import asyncio
  asyncio.run(fetch_upcoming_matches())

CLI:
  python scraper.py
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, asdict
from typing import List, Optional, Tuple
import os
from datetime import datetime
from dateutil import parser as dateparser

from playwright.async_api import async_playwright
from supabase import create_client, Client

VLR_MATCHES_URL = "https://www.vlr.gg/matches"


@dataclass
class UpcomingMatch:
    team1: str
    team2: str
    start_time: str  # raw time string as shown (could be 'LIVE', 'TBD', or localized time)
    url: str         # absolute URL to match page


async def fetch_upcoming_matches(headless: bool = True) -> List[UpcomingMatch]:
    """Fetch list of upcoming matches from vlr.gg/matches.

    Parsing strategy (as of Sept 2025 site layout):
    Each match block is typically a div with class 'wf-card' or inside 'matches-list'.
    We select anchor elements that wrap a match card: 'a.match-item' (commonly used).
    Within each, team names appear in elements with class 'match-item-vs-team-name'.
    The time appears in '.match-item-time' or '.match-item-status' when live.

    We keep the function resilient by using multiple query fallbacks.
    """
    results: List[UpcomingMatch] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=headless)
        page = await browser.new_page()
        await page.goto(VLR_MATCHES_URL, wait_until="domcontentloaded")

        # Wait a bit for dynamic content (if any) but not too long
        await page.wait_for_timeout(1500)

        # Candidate selectors for match anchors
        match_anchor_selector = "a.match-item"
        anchors = await page.query_selector_all(match_anchor_selector)

        for a in anchors:
            href = await a.get_attribute("href") or ""
            if not href.startswith("http"):
                match_url = f"https://www.vlr.gg{href}" if href.startswith("/") else f"https://www.vlr.gg/{href}"
            else:
                match_url = href

            # Team names
            team_nodes = await a.query_selector_all(".match-item-vs-team-name")
            if len(team_nodes) < 2:
                # Fallback older structure: elements with data-team-name or alt texts
                team_nodes = await a.query_selector_all("[data-team-name]")
            team_names: List[str] = []
            for t in team_nodes[:2]:
                txt = (await t.inner_text() or "").strip()
                if txt:
                    team_names.append(" ".join(txt.split()))
            if len(team_names) != 2:
                # Skip if we cannot confidently extract both teams
                continue

            # Time/status
            time_el = await a.query_selector(".match-item-time") or await a.query_selector(".match-item-status")
            time_text = (await time_el.inner_text() if time_el else "").strip() or "TBD"

            results.append(UpcomingMatch(team1=team_names[0], team2=team_names[1], start_time=time_text, url=match_url))

        await browser.close()
    return results


# ---------------- Supabase Persistence ---------------- #

def init_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("SUPABASE_PROJECT_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
    return create_client(url, key)


async def ensure_team(client: Client, name: str) -> Optional[str]:
    """Return team id, creating if needed."""
    name_norm = name.strip()
    existing = client.table("teams").select("id").eq("name", name_norm).limit(1).execute()
    if existing.data:
        return existing.data[0]["id"]
    ins = client.table("teams").insert({"name": name_norm}).execute()
    return ins.data[0]["id"] if ins.data else None


def parse_start_time(raw: str) -> datetime:
    # Attempt flexible parsing; if 'LIVE' or 'TBD', use now as placeholder to avoid duplicate inserts
    txt = raw.strip().upper()
    if txt in {"LIVE", "TBD", "ONGOING"}:
        return datetime.utcnow()
    try:
        # Many times on VLR include timezone or relative; rely on dateutil parse
        dt = dateparser.parse(raw)
        if not dt.tzinfo:
            # assume UTC if no tz
            return dt
        return dt.astimezone(tz=None).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()


def ensure_prop_type(client: Client, name: str) -> Optional[str]:
    existing = client.table("prop_types").select("id").eq("name", name).limit(1).execute()
    if existing.data:
        return existing.data[0]["id"]
    ins = client.table("prop_types").insert({"name": name}).execute()
    return ins.data[0]["id"] if ins.data else None


def predict_total_kills(player_name: str, team_name: str) -> float:
    """Stub predictive model.
    Replace with real model inference (e.g., load pickle/onnx). For now deterministic hash-based pseudo prediction.
    """
    base = sum(ord(c) for c in (player_name + team_name)) % 25
    return round(12 + base * 0.3, 1)  # yields roughly 12 - 19 range


async def fetch_roster(page, match_url: str) -> Tuple[List[str], List[str]]:
    """Visit match detail page and extract two rosters (up to 5 players each).
    Returns (team_a_players, team_b_players)."""
    try:
        await page.goto(match_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(800)
        # Common selectors: team containers with players list
        team_blocks = await page.query_selector_all(".vm-stats-game-header .team")
        if not team_blocks or len(team_blocks) < 2:
            # fallback: look for .match-header .wf-card .team
            team_blocks = await page.query_selector_all(".match-header .team")
        rosters: List[List[str]] = []
        for block in team_blocks[:2]:
            names = []
            # Player name selectors attempts
            player_nodes = await block.query_selector_all(".player, .wf-module-item, .mod-player")
            for pn in player_nodes:
                txt = (await pn.inner_text() or "").strip()
                if not txt:
                    continue
                clean = " ".join(txt.split())
                # filter out role labels etc.
                if len(clean) > 20:  # skip long text blocks
                    continue
                if clean.lower() in {"coach", "sub"}:
                    continue
                if clean and clean not in names:
                    names.append(clean)
                if len(names) >= 5:
                    break
            rosters.append(names)
        while len(rosters) < 2:
            rosters.append([])
        return rosters[0], rosters[1]
    except Exception as e:
        print(f"Roster parse failed for {match_url}: {e}")
        return [], []


async def persist_matches(matches: List[UpcomingMatch]):
    client = init_supabase()
    inserted = 0
    prop_type_id = ensure_prop_type(client, "Total Kills")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        for m in matches:
            try:
                team_a_id = await ensure_team(client, m.team1)
                team_b_id = await ensure_team(client, m.team2)
                if not team_a_id or not team_b_id:
                    continue
                start_time = parse_start_time(m.start_time)
                start_iso = start_time.isoformat(timespec="seconds")
                existing = client.table("matches").select("id").eq("team_a_id", team_a_id).eq("team_b_id", team_b_id).eq("start_time", start_iso).limit(1).execute()
                if existing.data:
                    continue  # skip enrichment for existing for now
                # Insert match
                match_ins = client.table("matches").insert({
                    "team_a_id": team_a_id,
                    "team_b_id": team_b_id,
                    "start_time": start_iso,
                    "status": "SCHEDULED"
                }).execute()
                if not match_ins.data:
                    continue
                match_id = match_ins.data[0]["id"]
                inserted += 1
                # Fetch rosters
                team_a_players, team_b_players = await fetch_roster(page, m.url)
                # Ensure players and insert prop lines
                for pname, tid in [(p, team_a_id) for p in team_a_players] + [(p, team_b_id) for p in team_b_players]:
                    if not pname:
                        continue
                    # ensure player
                    existing_player = client.table("players").select("id").eq("name", pname).eq("team_id", tid).limit(1).execute()
                    if existing_player.data:
                        player_id = existing_player.data[0]["id"]
                    else:
                        pinsert = client.table("players").insert({"name": pname, "team_id": tid}).execute()
                        player_id = pinsert.data[0]["id"] if pinsert.data else None
                    if not player_id or not prop_type_id:
                        continue
                    predicted = predict_total_kills(pname, m.team1 if tid == team_a_id else m.team2)
                    # Insert prop line for player
                    client.table("prop_lines").insert({
                        "match_id": match_id,
                        "player_id": player_id,
                        "prop_type_id": prop_type_id,
                        "line_value": predicted,
                        "status": "OPEN"
                    }).execute()
            except Exception as e:
                print(f"Failed to fully process match {m.team1} vs {m.team2}: {e}")
        await browser.close()
    print(f"Inserted {inserted} new matches (with generated prop lines).")


async def _main():
    matches = await fetch_upcoming_matches()
    for m in matches:
        print(asdict(m))
    # Persist
    await persist_matches(matches)


if __name__ == "__main__":
    asyncio.run(_main())
