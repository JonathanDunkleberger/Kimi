import os
import pandas as pd
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

"""Ingest scheduled matches from a CSV into the Match table.

Expected CSV columns (header row required):
  match_id, scheduled_at, team_a, team_b, event, map

Notes:
- scheduled_at should be ISO8601 or a parseable datetime.
- If a row already exists (same id) we update mutable fields (scheduledAt, teams, event, map, status stays SCHEDULED unless already LIVE/COMPLETED/CANCELED unless you pass --force-status).
- By default we set status=SCHEDULED (only for new rows).

Environment variables:
  DATABASE_URL (required)
  SCHEDULE_CSV_PATH (default: ml/data/schedule.csv)

Usage:
  python ml/ingest_schedule.py
"""

SCHEDULE_CSV_PATH = os.environ.get("SCHEDULE_CSV_PATH", "ml/data/schedule.csv")
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise SystemExit("DATABASE_URL env var required")

if not os.path.exists(SCHEDULE_CSV_PATH):
    raise SystemExit(f"Schedule CSV not found at {SCHEDULE_CSV_PATH}")

DF = pd.read_csv(SCHEDULE_CSV_PATH)
required = {"match_id", "scheduled_at", "team_a", "team_b"}
missing = required - set(DF.columns)
if missing:
    raise SystemExit(f"Missing required columns in schedule CSV: {missing}")

# Normalize / parse
DF['scheduled_at'] = pd.to_datetime(DF['scheduled_at'], utc=True, errors='coerce')
if DF['scheduled_at'].isna().any():
    bad = DF[DF['scheduled_at'].isna()]
    raise SystemExit(f"Unparseable scheduled_at values: {bad['match_id'].tolist()}")

rows = []
now = datetime.utcnow()
for _, r in DF.iterrows():
    rows.append((
        r['match_id'],
        r['scheduled_at'].to_pydatetime(),
        'SCHEDULED',  # status for new rows
        now,
        r.get('map') if 'map' in DF.columns else None,
        r.get('event') if 'event' in DF.columns else None,
        r.get('team_a'),
        r.get('team_b')
    ))

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
from psycopg2.extras import execute_values
sql = (
    'INSERT INTO "Match" (id, "scheduledAt", status, "createdAt", map, event, "teamA", "teamB") VALUES %s '
    'ON CONFLICT (id) DO UPDATE SET "scheduledAt"=EXCLUDED."scheduledAt", map=EXCLUDED.map, event=EXCLUDED.event, "teamA"=EXCLUDED."teamA", "teamB"=EXCLUDED."teamB"'
)
execute_values(cur, sql, rows)
conn.commit()
print(f"Upserted {len(rows)} matches from schedule CSV.")
cur.close()
conn.close()
