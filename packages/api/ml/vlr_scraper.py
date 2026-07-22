import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re
import sys
from fake_useragent import UserAgent

try:
    from http_util import get as http_get, session as http_session, DEFAULT_UA
except ImportError:
    from packages.api.ml.http_util import get as http_get, session as http_session, DEFAULT_UA  # type: ignore

VLR_ORIGIN = "https://www.vlr.gg"
DEFAULT_HEADERS = {
    "User-Agent": DEFAULT_UA,
}

# Demo-slate / Chronicle watchlist — refresh images + recent form when possible.
WATCHLIST_NAMES = [
    "TenZ",
    "zekken",
    "johnqt",
    "Sacy",
    "Zellsis",
    "Chronicle",
    "Boaster",
    "Alfajer",
    "crashies",
    "kaajak",
]


def _vlr_get(url: str):
    try:
        return http_get(url, timeout=20)
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None


def get_upcoming_matches():
    ua = UserAgent()
    headers = {'User-Agent': ua.random}
    # Fallback if random fails or is blocked, use the one that worked
    headers['User-Agent'] = DEFAULT_UA
    
    url = "https://www.vlr.gg/matches"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error fetching vlr.gg: {e}", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    matches = []
    
    # vlr.gg structure:
    # <div class="wf-label mod-large"> Date </div>
    # <div class="wf-card"> ... matches ... </div>
    
    # Actually, looking at the HTML snippet:
    # The date is in a text node or div before the matches?
    # Snippet:
    # Thu, November 27, 2025 
    # </div>
    # <div class="wf-card" ...>
    
    # It seems the date is inside a `.wf-label` usually.
    # Let's iterate over all `.wf-label` and `.match-item` in order.
    
    # Better strategy: Find all `a.match-item` and look at their preceding `.wf-label`?
    # Or iterate through the container.
    
    # Let's try to find the main container. usually `.col.mod-1`
    
    # Let's just find all match items and try to parse the ETA, which is relative and easier.
    
    match_items = soup.select('a.match-item')
    now = datetime.now(timezone.utc)
    
    for item in match_items:
        try:
            # ID and Link
            href = item.get('href')
            match_id = href.split('/')[1]
            
            # Teams
            team_names = item.select('.match-item-vs-team-name .text-of')
            if len(team_names) < 2:
                continue
            team_a = team_names[0].get_text(strip=True)
            team_b = team_names[1].get_text(strip=True)
            
            # Event
            event_div = item.select_one('.match-item-event')
            event_name = event_div.get_text(strip=True).replace('\t', '').replace('\n', ' ') if event_div else "Unknown Event"
            
            # ETA
            eta_div = item.select_one('.ml-eta')
            scheduled_at = None
            if eta_div:
                eta_text = eta_div.get_text(strip=True)
                # Parse "16h 50m", "2d 5h", "45m"
                delta = timedelta()
                
                # Regex for days, hours, minutes
                d_match = re.search(r'(\d+)d', eta_text)
                h_match = re.search(r'(\d+)h', eta_text)
                m_match = re.search(r'(\d+)m', eta_text)
                
                if d_match:
                    delta += timedelta(days=int(d_match.group(1)))
                if h_match:
                    delta += timedelta(hours=int(h_match.group(1)))
                if m_match:
                    delta += timedelta(minutes=int(m_match.group(1)))
                
                if delta.total_seconds() > 0:
                    scheduled_at = now + delta
            
            # If no ETA (e.g. LIVE), check for LIVE status
            status_div = item.select_one('.ml-status')
            status = "SCHEDULED"
            if status_div and "LIVE" in status_div.get_text(strip=True).upper():
                status = "LIVE"
                scheduled_at = now # Approximate
            
            if not scheduled_at:
                # If we can't parse ETA, maybe skip or try date parsing (harder without context)
                # For now, skip if no ETA and not LIVE
                continue
                
            matches.append({
                'id': match_id,
                'team_a': team_a,
                'team_b': team_b,
                'scheduled_at': scheduled_at.isoformat(),
                'event': event_name,
                'status': status,
                'source': 'vlr',
                'url': f"https://www.vlr.gg{href}"
            })
            
        except Exception as e:
            print(f"Error parsing match item: {e}", file=sys.stderr)
            continue
            
    return matches

def get_match_players(match_url):
    ua = UserAgent()
    headers = {'User-Agent': ua.random}
    # Fallback
    headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    
    try:
        resp = requests.get(match_url, headers=headers, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error fetching match details {match_url}: {e}", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    players = []
    
    # Players are in td.mod-player a
    # We need to associate them with a team.
    # The structure usually has two tables or lists, one for each team.
    # Or the table has a header with the team name.
    
    # In vlr match page, there are usually "Map 1", "Map 2" tabs, but the main "Match" tab lists rosters if available.
    # Or sometimes it's in the "Map Stats" section if the match is live/done.
    # For upcoming matches, it might just be a list of players if confirmed.
    
    # Let's look for .vm-stats-game (if live/done) or just .match-roster?
    # Actually, for upcoming matches, rosters might not be shown if not confirmed.
    # But the user said "vlr.gg has it displayed clearly".
    
    # Let's try to find all player links and assign them to teams based on order?
    # Usually Team A is first, Team B second.
    # But we need to be careful.
    
    # Let's look for .vm-stats-container if it exists.
    # Or just find all `td.mod-player a` and assume first 5 are Team A, next 5 are Team B?
    # That's risky.
    
    # Let's look at the HTML structure again.
    # The grep showed `td.mod-player`. This is usually in a table.
    # If there are multiple tables (one per map), we only want the aggregate or the first one.
    
    # In the grep output, I see `td.mod-player`.
    # I'll assume the first table or list of players belongs to the teams.
    
    player_links = soup.select('td.mod-player a')
    # Deduplicate by href/id
    seen_ids = set()
    
    for link in player_links:
        href = link.get('href')
        if not href or '/player/' not in href:
            continue
            
        pid = href.split('/')[2]
        if pid in seen_ids:
            continue
        seen_ids.add(pid)
        
        name = link.get_text(strip=True)
        
        players.append({
            'id': pid,
            'name': name,
            'url': f"https://www.vlr.gg{href}"
        })
        
    return players

def get_player_stats(player_url):
    ua = UserAgent()
    headers = {'User-Agent': ua.random}
    headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    
    try:
        resp = requests.get(player_url, headers=headers, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        print(f"Error fetching player stats {player_url}: {e}", file=sys.stderr)
        return {}

    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # Extract player image
    image_url = None
    header_img = soup.select_one('.player-header img')
    if header_img:
        src = header_img.get('src')
        if src and 'owcdn' in src:
            if src.startswith('//'):
                image_url = 'https:' + src
            else:
                image_url = src

    # Find the stats table. It's usually the first table in the "Stats" section or just the main table.
    # The table has headers like "Agent", "Usage", "Rounds", "Rating", "ACS", "K:D", "ADR", "KAST", "KPR", "APR", "FKPR", "FDPR", "K", "D", "A", "FK", "FD"
    
    # We want to aggregate these stats across all agents (weighted by rounds?)
    # Or just take the top agent? Weighted average is better.
    
    stats_table = soup.select_one('table.wf-table')
    if not stats_table:
        return {'image_url': image_url} if image_url else {}
        
    rows = stats_table.select('tbody tr')
    
    total_rounds = 0
    weighted_stats = {
        'kpr': 0.0,
        'adr': 0.0,
        'acs': 0.0,
        'fkpr': 0.0,
        'fdpr': 0.0,
        'hs_rate': 0.0, # Not in the table snippet above? Need to check if HS% is there.
        'clutch_rate': 0.0 # Not in table snippet.
    }
    
    # HS% and Clutch% might be in a different table or hidden?
    # In the snippet, I don't see HS%.
    # Wait, looking at the snippet again:
    # Agent, Usage, Rnd, Rat, ACS, K:D, ADR, KAST, KPR, APR, FKPR, FDPR, K, D, A, FK, FD
    # No HS% in this table.
    # Maybe it's in the "Detailed" tab or another section.
    # For now, we can estimate or just use what we have.
    # If the model requires HS%, we might have to put 0 or average.
    
    # Let's iterate rows
    for row in rows:
        cols = row.select('td')
        if len(cols) < 10:
            continue
            
        try:
            # Col 2: Rounds (index 2)
            rounds = int(cols[2].get_text(strip=True))
            if rounds == 0: continue
            
            # Col 4: ACS (index 4)
            acs = float(cols[4].get_text(strip=True))
            
            # Col 6: ADR (index 6)
            adr = float(cols[6].get_text(strip=True))
            
            # Col 8: KPR (index 8)
            kpr = float(cols[8].get_text(strip=True))
            
            # Col 10: FKPR (index 10)
            fkpr = float(cols[10].get_text(strip=True))
            
            # Col 11: FDPR (index 11)
            fdpr = float(cols[11].get_text(strip=True))
            
            total_rounds += rounds
            weighted_stats['kpr'] += kpr * rounds
            weighted_stats['adr'] += adr * rounds
            weighted_stats['acs'] += acs * rounds
            weighted_stats['fkpr'] += fkpr * rounds
            weighted_stats['fdpr'] += fdpr * rounds
            
        except ValueError:
            continue
            
    if total_rounds > 0:
        for k in ['kpr', 'adr', 'acs', 'fkpr', 'fdpr', 'hs_rate', 'clutch_rate']:
            if k in weighted_stats:
                weighted_stats[k] /= total_rounds
    
    if image_url:
        weighted_stats['image_url'] = image_url
            
    # Add other fields that might be needed by the model, set to 0 if unknown
    # The model likely needs: kpr, adr, acs, fkpr, fdpr, hs_rate, clutch_rate, kdr, kad, fk_fd_diff
    
    # We can calculate KDR and KAD from K, D, A totals if we parse them.
    # Let's parse K, D, A totals.
    
    total_k = 0
    total_d = 0
    total_a = 0
    total_fk = 0
    total_fd = 0
    
    for row in rows:
        cols = row.select('td')
        if len(cols) < 15: continue
        try:
            k = int(cols[12].get_text(strip=True))
            d = int(cols[13].get_text(strip=True))
            a = int(cols[14].get_text(strip=True))
            fk = int(cols[15].get_text(strip=True))
            fd = int(cols[16].get_text(strip=True))
            
            total_k += k
            total_d += d
            total_a += a
            total_fk += fk
            total_fd += fd
        except ValueError:
            continue
            
    if total_d > 0:
        weighted_stats['kdr'] = total_k / total_d
        weighted_stats['kad'] = (total_k + total_a) / total_d
    else:
        weighted_stats['kdr'] = 0.0
        weighted_stats['kad'] = 0.0
        
    weighted_stats['fk_fd_diff'] = total_fk - total_fd
    
    # HS% is often in the "Overview" or "Stats" tab but maybe not in this specific table.
    # We'll leave hs_rate and clutch_rate as 0.0 for now, or try to find them.

    weighted_stats["kills"] = total_k
    weighted_stats["deaths"] = total_d
    weighted_stats["assists"] = total_a
    weighted_stats["rounds"] = total_rounds
    
    return weighted_stats


def _parse_pct(text: str):
    text = (text or "").strip().replace("%", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_num(text: str):
    text = (text or "").strip().replace(",", "")
    if not text or text == "-":
        return None
    try:
        if "." in text:
            return float(text)
        return int(text)
    except ValueError:
        try:
            return float(text)
        except ValueError:
            return None


def get_stats_leaderboard(timespan: str = "90d", min_rounds: int = 100, limit: int = 100):
    """
    Scrape VLR.gg aggregate player stats table.
    Returns DemoStatRow-compatible VALORANT dicts.
    """
    url = (
        f"{VLR_ORIGIN}/stats/?event_group_id=all&event_id=all&region=all"
        f"&country=all&min_rounds={min_rounds}&min_rating=1550&agent=all"
        f"&map_id=all&timespan={timespan}"
    )
    resp = _vlr_get(url)
    if resp is None:
        # Fallback default stats landing page
        resp = _vlr_get(f"{VLR_ORIGIN}/stats")
    if resp is None:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.find("table")
    if not table:
        print("[vlr] no stats table found", file=sys.stderr)
        return []

    out = []
    for row in table.find_all("tr")[1:]:
        tds = row.find_all("td")
        if len(tds) < 21:
            continue
        link = tds[0].select_one('a[href*="/player/"]')
        if not link:
            continue
        href = link.get("href") or ""
        parts = href.strip("/").split("/")
        # /player/{id}/{slug}
        pid = parts[1] if len(parts) >= 2 else href
        name_el = tds[0].select_one(".st-pl-name")
        team_el = tds[0].select_one(".st-pl-country")
        name = name_el.get_text(strip=True) if name_el else link.get_text(strip=True)
        team = team_el.get_text(strip=True) if team_el else ""

        maps = _parse_num(tds[2].get_text(strip=True)) or 0
        rating = _parse_num(tds[4].get_text(strip=True)) or 0
        acs = _parse_num(tds[5].get_text(strip=True))
        hs = _parse_pct(tds[14].get_text(strip=True))
        kills = _parse_num(tds[18].get_text(strip=True)) or 0
        deaths = _parse_num(tds[19].get_text(strip=True)) or 0
        assists = _parse_num(tds[20].get_text(strip=True)) or 0

        out.append(
            {
                "playerId": f"val-{pid}",
                "name": name,
                "team": team or "VLR",
                "game": "VALORANT",
                "imageUrl": "",
                "maps": int(maps),
                "kills": int(kills),
                "deaths": int(deaths),
                "assists": int(assists),
                "rating": round(float(rating), 3),
                "acs": int(acs) if acs is not None else None,
                "hsPercent": round(hs, 1) if hs is not None else None,
                "source": "vlr",
                "profileUrl": f"{VLR_ORIGIN}{href}" if href.startswith("/") else href,
            }
        )
        if len(out) >= limit:
            break

    print(f"[vlr] leaderboard rows={len(out)}", file=sys.stderr)
    return out


def _player_id_from_href(href: str):
    """Extract numeric VLR player id from /player/{id}/... or /search/r/player/{id}/idx."""
    if not href:
        return None
    parts = href.strip("/").split("/")
    for i, part in enumerate(parts):
        if part == "player" and i + 1 < len(parts) and parts[i + 1].isdigit():
            return parts[i + 1]
    return None


def search_player(name: str):
    """Best-effort VLR player search. Returns {id, name, url} or None."""
    from urllib.parse import quote

    q = quote(name)
    resp = _vlr_get(f"{VLR_ORIGIN}/search/?type=players&q={q}")
    if resp is None:
        return None
    soup = BeautifulSoup(resp.text, "html.parser")
    candidates = []
    for a in soup.select('a[href*="/player/"]'):
        href = a.get("href") or ""
        pid = _player_id_from_href(href)
        if not pid:
            continue
        text = a.get_text(" ", strip=True)
        candidates.append((pid, text, href))

    if not candidates:
        return None

    # Prefer exact name match (case-insensitive) on the first token / full text.
    name_l = name.lower()
    exact = [c for c in candidates if c[1].split()[0].lower() == name_l or c[1].lower() == name_l]
    pick = exact[0] if exact else candidates[0]
    pid = pick[0]
    return {
        "id": pid,
        "name": name,
        "url": f"{VLR_ORIGIN}/player/{pid}",
    }


def get_watchlist_players(names=None):
    """
    Resolve watchlist names to player pages and pull recent stats + avatars.
    Fail-soft per player.
    """
    names = names or WATCHLIST_NAMES
    rows = []
    for name in names:
        try:
            hit = search_player(name)
            if not hit:
                print(f"[vlr] watchlist miss: {name}", file=sys.stderr)
                continue
            stats = get_player_stats(hit["url"]) or {}
            image = stats.get("image_url") or ""
            kills = int(stats.get("kills") or 0)
            deaths = int(stats.get("deaths") or 0)
            assists = int(stats.get("assists") or 0)
            rounds = int(stats.get("rounds") or 0)
            # Approximate maps from rounds (~20-26 per map); keep rounds/20.
            maps = max(1, rounds // 22) if rounds else 0
            rating = float(stats.get("kdr") or 0)
            # Prefer ACS from weighted agent table
            acs = stats.get("acs")
            rows.append(
                {
                    "playerId": f"val-{hit['id']}",
                    "name": name,
                    "team": "",
                    "game": "VALORANT",
                    "imageUrl": image,
                    "maps": maps,
                    "kills": kills,
                    "deaths": deaths,
                    "assists": assists,
                    "rating": round(rating, 3) if rating else 0.0,
                    "acs": int(acs) if acs else None,
                    "hsPercent": None,
                    "source": "vlr",
                    "profileUrl": hit["url"],
                }
            )
        except Exception as e:
            print(f"[vlr] watchlist error {name}: {e}", file=sys.stderr)
            continue
    print(f"[vlr] watchlist refreshed={len(rows)}", file=sys.stderr)
    return rows


def enrich_image_urls(players, max_fetch: int = 25):
    """Fill missing imageUrl by visiting player profile pages (capped)."""
    fetched = 0
    for p in players:
        if p.get("imageUrl"):
            continue
        if fetched >= max_fetch:
            break
        url = p.get("profileUrl")
        if not url:
            continue
        try:
            stats = get_player_stats(url) or {}
            if stats.get("image_url"):
                p["imageUrl"] = stats["image_url"]
            fetched += 1
        except Exception:
            continue
    return players


if __name__ == "__main__":
    for row in get_stats_leaderboard(limit=5):
        print(row)
