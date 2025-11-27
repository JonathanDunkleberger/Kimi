import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import re
import sys
from fake_useragent import UserAgent

def get_upcoming_matches():
    ua = UserAgent()
    headers = {'User-Agent': ua.random}
    # Fallback if random fails or is blocked, use the one that worked
    headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    
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
    
    return weighted_stats

if __name__ == "__main__":
    matches = get_upcoming_matches()
    for m in matches:
        print(m)
