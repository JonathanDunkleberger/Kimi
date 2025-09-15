import os
from datetime import datetime, timezone, timedelta
import psycopg2
from dotenv import load_dotenv

load_dotenv()

"""Automatic match status transitions.

States:
  SCHEDULED -> LIVE -> COMPLETED

Rules (configurable via env):
  MATCH_LIVE_LEAD_MINUTES: int (default 0)
      If now >= scheduledAt - lead -> mark LIVE.
  MATCH_AUTOCOMPLETE_MINUTES: int (default 90)
      If now >= scheduledAt + autocomplete window -> mark COMPLETED.
  MATCH_ALLOW_ROLLBACK: 0/1 (default 0)
      If 1 and scheduledAt pushed far into future while LIVE, can revert to SCHEDULED.

Idempotent: Running multiple times will only change rows whose transition predicates are met.

Usage:
  python ml/update_match_statuses.py
"""

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise SystemExit("DATABASE_URL required")

LIVE_LEAD = int(os.environ.get("MATCH_LIVE_LEAD_MINUTES", "0"))
AUTOCOMPLETE = int(os.environ.get("MATCH_AUTOCOMPLETE_MINUTES", "90"))
ALLOW_ROLLBACK = os.environ.get("MATCH_ALLOW_ROLLBACK", "0") == "1"

now = datetime.now(timezone.utc)

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# 1. Promote SCHEDULED -> LIVE
cur.execute(
    """
    UPDATE "Match" m
    SET status='LIVE', "updatedAt"=NOW()
    WHERE m.status='SCHEDULED'
      AND NOW() >= m."scheduledAt" - (INTERVAL '1 minute' * %s)
    RETURNING m.id;
    """,
    (LIVE_LEAD,)
)
promoted = [r[0] for r in cur.fetchall()]

# 2. Complete LIVE -> COMPLETED
cur.execute(
    """
    UPDATE "Match" m
    SET status='COMPLETED', "updatedAt"=NOW()
    WHERE m.status='LIVE'
      AND NOW() >= m."scheduledAt" + (INTERVAL '1 minute' * %s)
    RETURNING m.id;
    """,
    (AUTOCOMPLETE,)
)
completed = [r[0] for r in cur.fetchall()]

# 3. Optional rollback LIVE -> SCHEDULED if schedule moved forward significantly
rolled_back = []
if ALLOW_ROLLBACK:
    cur.execute(
        """
        UPDATE "Match" m
        SET status='SCHEDULED', "updatedAt"=NOW()
        WHERE m.status='LIVE'
          AND NOW() < m."scheduledAt" - (INTERVAL '1 minute' * %s)
        RETURNING m.id;
        """,
        (LIVE_LEAD,)
    )
    rolled_back = [r[0] for r in cur.fetchall()]

conn.commit()
print(
    f"Status update run @ {now.isoformat()} | promoted={len(promoted)} completed={len(completed)} rollback={len(rolled_back)}"
)
if promoted:
    print("Promoted to LIVE:", promoted)
if completed:
    print("Completed:", completed)
if rolled_back:
    print("Rolled back to SCHEDULED:", rolled_back)

cur.close()
conn.close()
