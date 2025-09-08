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
from typing import List, Optional
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


async def persist_matches(matches: List[UpcomingMatch]):
    client = init_supabase()
    inserted = 0
    for m in matches:
        try:
            team_a_id = await ensure_team(client, m.team1)
            team_b_id = await ensure_team(client, m.team2)
            if not team_a_id or not team_b_id:
                continue
            start_time = parse_start_time(m.start_time)
            # Check existing (same teams & start_time within one minute tolerance)
            # Since start_time is timestamptz in DB, we match exact ISO string; adjust if needed.
            start_iso = start_time.isoformat(timespec="seconds")
            existing = client.table("matches").select("id").eq("team_a_id", team_a_id).eq("team_b_id", team_b_id).eq("start_time", start_iso).limit(1).execute()
            if existing.data:
                continue
            client.table("matches").insert({
                "team_a_id": team_a_id,
                "team_b_id": team_b_id,
                "start_time": start_iso,
                "status": "SCHEDULED"
            }).execute()
            inserted += 1
        except Exception as e:
            print(f"Failed to persist match {m.team1} vs {m.team2}: {e}")
    print(f"Inserted {inserted} new matches (out of {len(matches)} scraped).")


async def _main():
    matches = await fetch_upcoming_matches()
    for m in matches:
        print(asdict(m))
    # Persist
    await persist_matches(matches)


if __name__ == "__main__":
    asyncio.run(_main())
