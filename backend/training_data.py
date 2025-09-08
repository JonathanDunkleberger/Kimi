"""Scrape historical player statistics from past matches on vlr.gg.

Collected Fields per (Match, Map, Player):
  - match_id (derived from VLR URL slug)
  - match_url
  - map_name
  - player_handle
  - agent
  - kills
  - acs (Average Combat Score)

Output:
  Creates/overwrites CSV: player_stats.csv in the backend directory.

Usage:
  python training_data.py --limit 50

Notes:
  - This is a best-effort scraper; site markup can change.
  - Be respectful of rate limits; includes small delays.
  - Requires: pip install playwright ; playwright install chromium
"""
from __future__ import annotations

import asyncio
import csv
import os
import re
import time
import random
from dataclasses import dataclass, asdict
from typing import List, Optional
from urllib.parse import urljoin

from playwright.async_api import async_playwright

BASE_URL = "https://www.vlr.gg"
MATCH_ARCHIVE_URL = "https://www.vlr.gg/matches/results"  # Past results listing
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), "player_stats.csv")

@dataclass
class PlayerStat:
    match_id: str
    match_url: str
    map_name: str
    player_handle: str
    agent: str
    kills: int
    acs: int

# ---------------- Helper Functions ---------------- #

async def fetch_past_match_links(page, limit: int) -> List[str]:
    """Fetch past match detail URLs from the results listing page.
    The page lists anchors to finished matches.
    """
    await page.goto(MATCH_ARCHIVE_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(1200)
    anchors = await page.query_selector_all("a.match-item")
    links = []
    for a in anchors:
        href = await a.get_attribute("href") or ""
        if not href:
            continue
        if not href.startswith("http"):
            href = urljoin(BASE_URL, href)
        if href not in links:
            links.append(href)
        if len(links) >= limit:
            break
    return links

async def scrape_match(page, match_url: str) -> List[PlayerStat]:
    """Scrape one finished match's scoreboard per map.
    Attempts to handle multiple maps by looking for map tabs / sections.
    """
    stats: List[PlayerStat] = []
    try:
        await page.goto(match_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        # Derive match id from URL pattern e.g. https://www.vlr.gg/123456/event-name... -> 123456
        m = re.search(r"/([0-9]+)/", match_url.rstrip('/') + '/')
        match_id = m.group(1) if m else match_url

        # Identify map containers: often have class 'vm-stats-game' per map
        map_sections = await page.query_selector_all('.vm-stats-game')
        if not map_sections:
            # Fallback: single scoreboard
            map_sections = [page]
        map_index = 0
        for section in map_sections:
            map_index += 1
            # Attempt to read map name
            map_name = "Map" + str(map_index)
            title_el = await section.query_selector('.map') or await section.query_selector('.vm-stats-game-header .map')
            if title_el:
                txt = (await title_el.inner_text() or '').strip()
                if txt:
                    map_name = ' '.join(txt.split())

            # Rows: scoreboard table rows inside this section
            rows = await section.query_selector_all('table tbody tr')
            for r in rows:
                cells = await r.query_selector_all('td')
                if len(cells) < 6:
                    continue
                # Player handle typically first or second cell
                handle_text = (await cells[0].inner_text() or '').strip()
                if not handle_text or len(handle_text) > 30:
                    continue
                # Agent: look for img alt or text in a cell with an agent icon
                agent = ''
                agent_img = await r.query_selector('img')
                if agent_img:
                    agent = (await agent_img.get_attribute('alt') or '').strip()
                if not agent:
                    # fallback: cell with class 'mod-agent' maybe
                    agent_cell = await r.query_selector('.mod-agent')
                    if agent_cell:
                        agent = (await agent_cell.inner_text() or '').strip()
                # Kills: assume a numeric cell after player name; heuristically find first int in next few cells
                kills = None
                acs = None
                for c in cells[1:8]:
                    txt = (await c.inner_text() or '').strip()
                    if kills is None and txt.isdigit():
                        kills = int(txt)
                        continue
                    # ACS often 3-digit (e.g., 235) and may have 'ACS' header; pick second numeric > 20 if kills already found
                    if kills is not None and acs is None and txt.isdigit() and int(txt) > 30:
                        acs = int(txt)
                if kills is None:
                    continue
                if acs is None:
                    acs = 0
                stats.append(PlayerStat(
                    match_id=match_id,
                    match_url=match_url,
                    map_name=map_name,
                    player_handle=handle_text,
                    agent=agent or 'Unknown',
                    kills=kills,
                    acs=acs
                ))
    except Exception as e:
        print(f"Failed scraping match {match_url}: {e}")
    return stats

# ---------------- Main Orchestration ---------------- #

async def collect_player_stats(limit_matches: int = 50, delay_range=(0.8, 1.6)) -> List[PlayerStat]:
    collected: List[PlayerStat] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        links = await fetch_past_match_links(page, limit_matches)
        print(f"Collected {len(links)} match URLs")
        for idx, url in enumerate(links, 1):
            per_match = await scrape_match(page, url)
            collected.extend(per_match)
            print(f"[{idx}/{len(links)}] match stats rows: {len(per_match)} (total {len(collected)})")
            # polite delay
            await page.wait_for_timeout(int(1000 * random.uniform(*delay_range)))
        await browser.close()
    return collected

def write_csv(rows: List[PlayerStat], path: str = OUTPUT_CSV):
    fieldnames = list(PlayerStat.__annotations__.keys())
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(asdict(r))
    print(f"Wrote {len(rows)} rows to {path}")

async def _main():
    import argparse
    ap = argparse.ArgumentParser(description="Scrape historical VLR player stats")
    ap.add_argument('--limit', type=int, default=50, help='Number of past matches to scrape')
    ap.add_argument('--out', type=str, default=OUTPUT_CSV, help='Output CSV path')
    args = ap.parse_args()
    rows = await collect_player_stats(args.limit)
    write_csv(rows, args.out)

if __name__ == '__main__':
    asyncio.run(_main())
