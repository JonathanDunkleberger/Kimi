import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

CSV_PATH = os.environ.get("STATS_CSV_PATH", "ml/data/match_stats.csv")
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL env var required")

if not os.path.exists(CSV_PATH):
    raise SystemExit(f"CSV not found at {CSV_PATH}")

print(f"Loading stats from {CSV_PATH}")

df = pd.read_csv(CSV_PATH)
required_cols = {"player_id","player_name","team","match_id","kills","match_date"}
if not required_cols.issubset(df.columns):
    raise SystemExit("CSV missing required columns")

# Upsert players, then insert match stats (ignore existing unique conflicts by pre-delete)
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

players = df[["player_id","player_name","team"]].drop_duplicates()
for _, row in players.iterrows():
    cur.execute("DELETE FROM \"Player\" WHERE id=%s", (row.player_id,))
    cur.execute("INSERT INTO \"Player\" (id, name, team) VALUES (%s,%s,%s)", (row.player_id, row.player_name, row.team))

stats_rows = []
for _, r in df.iterrows():
    stats_rows.append((r.player_id, r.match_id, float(r.kills)))

# Delete existing duplicates then insert
for (pid, mid, _k) in stats_rows:
    cur.execute("DELETE FROM \"PlayerMatchStat\" WHERE \"playerId\"=%s AND \"matchId\"=%s", (pid, mid))

execute_values(cur, "INSERT INTO \"PlayerMatchStat\" (\"playerId\", \"matchId\", \"kills\") VALUES %s", stats_rows)
conn.commit()
print(f"Ingested {len(stats_rows)} match stat rows.")
cur.close()
conn.close()
