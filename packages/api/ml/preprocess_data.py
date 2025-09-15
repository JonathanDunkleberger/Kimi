"""Preprocess Valorant historical data into a unified training dataset.

Reads:
  - all_ids/*.csv (match + tournament metadata)
  - vct_YYYY/players_stats/players_stats.csv across available years

Produces:
  - ml/data/training_data.csv

Joining strategy:
  1. Concatenate all yearly players_stats with a Year column inferred from directory or from matches mapping.
  2. Normalize column names (snake_case, safe identifiers).
  3. Join with all_matches_games_ids on (Tournament, Stage, Match Type) to enrich with Match ID, Map, Year.
  4. Derive simple engineered features (kdr, kad, fk_fd_diff, hs_rate, clutch_rate).

Assumptions:
  - Directory structure preserved as in imported Kaggle dataset.
  - Column names in players_stats might contain commas inside quoted combined agent strings; pandas handles this.

Usage:
  python packages/api/ml/preprocess_data.py
"""
from __future__ import annotations
import os
import re
import sys
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).parent
DATA_DIR = ROOT / 'data' / 'Val-historical-stats'
OUTPUT_FILE = ROOT / 'data' / 'training_data.csv'

# Directories expected inside DATA_DIR for yearly splits (vct_2021, vct_2022, ...)
YEAR_DIR_PATTERN = re.compile(r'vct_(\\d{4})')

ID_DIR = DATA_DIR / 'all_ids'
MATCHES_FILE = ID_DIR / 'all_matches_games_ids.csv'
PLAYERS_IDS_FILE = ID_DIR / 'all_players_ids.csv'
TEAMS_IDS_FILE = ID_DIR / 'all_teams_ids.csv'

RENAME_MAP = {
    'Tournament': 'tournament',
    'Stage': 'stage',
    'Match Type': 'match_type',
    'Player': 'player',
    'Teams': 'team',
    'Agents': 'agents',
    'Rounds Played': 'rounds_played',
    'Rating': 'rating',
    'Average Combat Score': 'acs',
    'Kills:Deaths': 'kills_deaths',
    'Kill, Assist, Trade, Survive %': 'kats_pct',
    'Average Damage Per Round': 'adr',
    'Kills Per Round': 'kpr',
    'Assists Per Round': 'apr',
    'First Kills Per Round': 'fkpr',
    'First Deaths Per Round': 'fdpr',
    'Headshot %': 'hs_pct',
    'Clutch Success %': 'clutch_success_pct',
    'Clutches (won/played)': 'clutches_won_played',
    'Maximum Kills in a Single Map': 'max_kills_map',
    'Kills': 'kills',
    'Deaths': 'deaths',
    'Assists': 'assists',
    'First Kills': 'first_kills',
    'First Deaths': 'first_deaths'
}

ENGINEERED_ORDER = [
    'kdr', 'kad', 'fk_fd_diff', 'hs_rate', 'clutch_rate'
]

META_KEEP = [
    'tournament', 'stage', 'match_type', 'map', 'year', 'game_id', 'match_id'
]

PLAYER_KEEP = [
    'player', 'team', 'agents', 'rounds_played', 'rating', 'acs', 'adr', 'kpr', 'apr', 'fkpr', 'fdpr',
    'kills', 'deaths', 'assists', 'first_kills', 'first_deaths', 'hs_pct', 'clutch_success_pct',
    'clutches_won_played', 'max_kills_map'
]

def _infer_year_from_path(p: Path) -> int | None:
    # Search each part for 4-digit year
    for part in p.parts[::-1]:
        m = re.search(r"(20\d{2})", part)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                continue
    return None

def load_matches() -> pd.DataFrame:
    """Recursively discover the matches metadata CSV.

    Looks for a file named exactly 'all_matches_games_ids.csv' anywhere under DATA_DIR.
    If multiple are found, prefers the one with the greatest file size (assumed most complete).
    """
    candidates: list[Path] = []
    for root, _dirs, files in os.walk(DATA_DIR):
        for f in files:
            if f.lower() == 'all_matches_games_ids.csv':
                candidates.append(Path(root) / f)

    if not candidates:
        raise FileNotFoundError(
            f"Could not locate 'all_matches_games_ids.csv' under {DATA_DIR}. Searched recursively."
        )

    # Pick largest file (heuristic for most complete)
    chosen = max(candidates, key=lambda p: p.stat().st_size)
    print(f"[preprocess] Using matches file: {chosen} (found {len(candidates)} candidates)", file=sys.stderr)

    df = pd.read_csv(chosen)
    rename_map = {
        'Tournament': 'tournament',
        'Stage': 'stage',
        'Match Type': 'match_type',
        'Map': 'map',
        'Game ID': 'game_id',
        'Match ID': 'match_id',
        'Year': 'year'
    }
    df = df.rename(columns=rename_map)

    # Normalize whitespace in key columns for safer joins
    for col in ['tournament', 'stage', 'match_type']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
    return df

def parse_year_from_dir(path: Path) -> int | None:
    m = YEAR_DIR_PATTERN.match(path.name)
    if m:
        return int(m.group(1))
    return None

def load_all_player_stats() -> pd.DataFrame:
    """Recursively load every players_stats.csv under DATA_DIR.

    Year inference order:
      1. Four-digit year detected in any directory segment of the file path.
      2. 'Year' column in the CSV if present.
      3. Fallback: -1 (unknown year).
    """
    rows: list[pd.DataFrame] = []
    file_count = 0
    for root, _dirs, files in os.walk(DATA_DIR):
        for f in files:
            if f.lower() == 'players_stats.csv':
                file_count += 1
                path = Path(root) / f
                try:
                    df = pd.read_csv(path)
                except Exception as e:  # skip unreadable files but log
                    print(f"[preprocess] WARN could not read {path}: {e}", file=sys.stderr)
                    continue
                inferred_year = _infer_year_from_path(path)
                if 'Year' in df.columns and pd.api.types.is_numeric_dtype(df['Year']):
                    # Trust explicit column if consistent
                    year_series = df['Year'].dropna().unique()
                    if len(year_series) == 1:
                        inferred_year = int(year_series[0])
                df['__year_from_dir'] = inferred_year if inferred_year is not None else -1
                rows.append(df)

    if not rows:
        raise RuntimeError(
            f"No players_stats.csv files found under {DATA_DIR} (searched {file_count} potential locations)."
        )

    combined = pd.concat(rows, ignore_index=True)
    print(f"[preprocess] Loaded {len(rows)} players_stats partitions; total rows={len(combined)}", file=sys.stderr)
    return combined

def normalize_player_stats(df: pd.DataFrame) -> pd.DataFrame:
    # Rename columns
    df = df.rename(columns=RENAME_MAP)
    # Some percentage columns are like '31%' – strip and convert
    pct_cols = ['kats_pct', 'hs_pct', 'clutch_success_pct']
    for c in pct_cols:
        if c in df.columns:
            df[c] = df[c].astype(str).str.replace('%', '', regex=False).replace({'': None}).astype(float)
    # Expand clutches (won/played)
    if 'clutches_won_played' in df.columns:
        parts = df['clutches_won_played'].astype(str).str.split('/', n=1, expand=True)
        df['clutches_won'] = pd.to_numeric(parts[0], errors='coerce')
        df['clutches_played'] = pd.to_numeric(parts[1], errors='coerce')
    # Kills:Deaths ratio field e.g. '55:39'
    if 'kills_deaths' in df.columns:
        kd_parts = df['kills_deaths'].astype(str).str.split(':', n=1, expand=True)
        df['kills_kd_field'] = pd.to_numeric(kd_parts[0], errors='coerce')
        df['deaths_kd_field'] = pd.to_numeric(kd_parts[1], errors='coerce')
    return df

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    # Basic ratios with safety checks
    df['kdr'] = (df['kills'] / df['deaths']).replace([pd.NA, pd.NaT, float('inf')], None)
    df['kad'] = ((df['kills'] + df['assists']) / df['deaths']).replace([pd.NA, pd.NaT, float('inf')], None)
    df['fk_fd_diff'] = df['first_kills'] - df['first_deaths']
    df['hs_rate'] = df['hs_pct'] / 100.0
    df['clutch_rate'] = df.apply(lambda r: (r['clutches_won'] / r['clutches_played']) if r.get('clutches_played') not in (0, None, float('nan')) else None, axis=1)
    return df

def main():
    print("[preprocess] Loading data...", file=sys.stderr)
    matches = load_matches()
    players_raw = load_all_player_stats()
    players_norm = normalize_player_stats(players_raw)

    # Join: matches are per map row; player stats aggregated per (Tournament, Stage, Match Type). We might not have map-level granularity; left join on keys.
    join_keys = ['tournament', 'stage', 'match_type']
    if not all(k in matches.columns for k in join_keys):
        raise RuntimeError("Missing expected join keys in matches metadata.")

    # Add fallback year if year column missing in player stats
    if 'year' not in players_norm.columns and '__year_from_dir' in players_norm.columns:
        players_norm['year'] = players_norm['__year_from_dir']

    merged = players_norm.merge(
        matches[join_keys + ['match_id', 'game_id', 'map', 'year']].drop_duplicates(),
        on=join_keys,
        how='left'
    )

    engineered = engineer_features(merged)

    # Select & order columns
    available_player = [c for c in PLAYER_KEEP if c in engineered.columns]
    final_cols = available_player + [c for c in META_KEEP if c in engineered.columns and c not in available_player] + ENGINEERED_ORDER
    final_cols_existing = [c for c in final_cols if c in engineered.columns]

    final = engineered[final_cols_existing].copy()

    # Sort for stability
    sort_cols = [c for c in ['year', 'tournament', 'player'] if c in final.columns]
    if sort_cols:
        final = final.sort_values(sort_cols)

    # Output directory
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    final.to_csv(OUTPUT_FILE, index=False)
    print(f"[preprocess] Wrote {OUTPUT_FILE} rows={len(final)} cols={len(final.columns)}", file=sys.stderr)

if __name__ == '__main__':
    main()
