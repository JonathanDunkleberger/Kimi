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
import sys
from dataclasses import dataclass, asdict
from typing import List, Optional, Tuple
import os
from datetime import datetime
from dateutil import parser as dateparser

from playwright.async_api import async_playwright
from supabase import create_client, Client
from model_infer import predict_total_kills  # real model-backed prediction

# ---------------- Configuration: Professional Event Filtering ---------------- #

APPROVED_KEYWORDS = [
    "VCT",
    "Champions",
    "Masters",
    "Kickoff",
    "International League",
    "Americas",
    "EMEA",
    "Pacific",
    "China",
    "Game Changers",  # Top-tier women's league
]

def is_approved_event(event_name: str) -> bool:
    if not event_name:
        return False
    lower = event_name.lower()
    return any(k.lower() in lower for k in APPROVED_KEYWORDS)

VLR_MATCHES_URL = "https://www.vlr.gg/matches"


@dataclass
class UpcomingMatch:
    team1: str
    team2: str
    start_time: str  # raw time string as shown (could be 'LIVE', 'TBD', or localized time)
    url: str         # absolute URL to match page
    event_name: str  # extracted tournament / league name


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

            # Attempt to extract event / tournament name (multiple selector fallbacks)
            event_selectors = [
                ".match-item-event",
                ".match-item-league",
                ".match-item-series",
                ".match-item-header .text-of",
            ]
            event_name = ""
            for sel in event_selectors:
                el = await a.query_selector(sel)
                if el:
                    txt = (await el.inner_text() or "").strip()
                    if txt:
                        event_name = " ".join(txt.split())
                        break
            # Fallback: attribute data-event-name if present
            if not event_name:
                maybe_attr = await a.get_attribute("data-event-name")
                if maybe_attr:
                    event_name = maybe_attr.strip()
            if not event_name:
                event_name = "Unknown"

            results.append(UpcomingMatch(team1=team_names[0], team2=team_names[1], start_time=time_text, url=match_url, event_name=event_name))

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


## Removed local stub; using model_infer.predict_total_kills


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
                # Filter: only persist if tournament/event is approved
                if not is_approved_event(getattr(m, "event_name", "")):
                    print(f"Skipping non-pro event: {m.team1} vs {m.team2} | Event='{getattr(m, 'event_name', 'Unknown')}'")
                    continue
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
                    "status": "SCHEDULED",
                    "vlr_url": m.url,
                    "event_name": getattr(m, "event_name", None)
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
    # Default behavior: scrape upcoming & persist
    matches = await fetch_upcoming_matches()
    for m in matches:
        print(asdict(m))
    await persist_matches(matches)


# ---------------- Settlement (Results) Logic ---------------- #

async def scrape_final_scoreboard(page, match_url: str) -> dict:
    """Scrape final scoreboard for a completed match.

    Returns dict mapping player_name -> kills.
    Tries multiple selector strategies to be resilient to layout changes.
    """
    data = {}
    try:
        await page.goto(match_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)
        # Potential scoreboard row selectors
        row_selectors = [
            ".vm-stats-game .wf-table tbody tr",
            ".scoreboard tbody tr",
            "table tbody tr"
        ]
        rows = []
        for sel in row_selectors:
            rows = await page.query_selector_all(sel)
            if rows:
                break
        for r in rows:
            text = (await r.inner_text() or "").strip()
            if not text:
                continue
            # Extract cells
            tds = await r.query_selector_all("td")
            if len(tds) < 5:
                continue
            name_cell = tds[0]
            name = (await name_cell.inner_text() or "").strip()
            if not name or len(name) > 24:
                continue
            # Try to find kills: often second or third numeric column
            kills = None
            for td in tds[1:6]:
                val = (await td.inner_text() or "").strip()
                if val.isdigit():
                    # heuristically accept first numeric as kills if not yet set
                    kills = int(val)
                    break
            if kills is not None:
                data[name] = kills
    except Exception as e:
        print(f"Failed scoreboard scrape for {match_url}: {e}")
    return data


async def settle_completed_matches():
    """Find matches marked COMPLETED, scrape final results, and call settlement RPC for each prop line."""
    client = init_supabase()
    # Fetch completed matches with a stored URL
    resp = client.table("matches").select("id, vlr_url").eq("status", "COMPLETED").not_.is_("vlr_url", "null").execute()
    matches = resp.data or []
    if not matches:
        print("No completed matches to settle.")
        return
    # Fetch prop type id for total kills (if using prop_types/prop_lines schema)
    total_prop_type = None
    try:
        p = client.table("prop_types").select("id").eq("name", "Total Kills").limit(1).execute()
        if p.data:
            total_prop_type = p.data[0]["id"]
    except Exception:
        pass
    settled_count = 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        for m in matches:
            match_id = m["id"]
            url = m.get("vlr_url")
            if not url:
                continue
            scoreboard = await scrape_final_scoreboard(page, url)
            if not scoreboard:
                continue
            # For each player kill total attempt to find matching prop lines
            for player_name, kills in scoreboard.items():
                # Attempt to locate player record
                player_resp = client.table("players").select("id").eq("name", player_name).limit(1).execute()
                if not player_resp.data:
                    # Alternative column name 'handle'
                    player_resp = client.table("players").select("id").eq("handle", player_name).limit(1).execute()
                if not player_resp.data:
                    continue
                player_id = player_resp.data[0]["id"]
                # Fetch prop line(s). Prefer prop_lines table; fallback to lines.
                line_id = None
                try:
                    if total_prop_type:
                        pl = client.table("prop_lines").select("id").eq("match_id", match_id).eq("player_id", player_id).eq("prop_type_id", total_prop_type).eq("status", "OPEN").limit(1).execute()
                        if pl.data:
                            line_id = pl.data[0]["id"]
                    if not line_id:
                        # fallback lines table (stat = 'kills_match')
                        ln = client.table("lines").select("id, stat, status").eq("match_id", match_id).eq("player_id", player_id).eq("stat", "kills_match").eq("status", "OPEN").limit(1).execute()
                        if ln.data:
                            line_id = ln.data[0]["id"]
                except Exception:
                    pass
                if not line_id:
                    continue
                # Call settlement RPC
                try:
                    client.rpc("settle_prop_line", {"prop_line_id": line_id, "actual_result": kills}).execute()
                    settled_count += 1
                except Exception as e:
                    print(f"Settlement RPC failed for line {line_id}: {e}")
        await browser.close()
    print(f"Settled {settled_count} prop lines.")


def cli():
    if len(sys.argv) > 1 and sys.argv[1].lower() in {"settle", "results"}:
        asyncio.run(settle_completed_matches())
    else:
        asyncio.run(_main())


if __name__ == "__main__":
    cli()
