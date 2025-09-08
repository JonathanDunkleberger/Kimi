# Valorant Props Backend (FastAPI)

## Local run (SQLite)
```bash
cp .env.example .env
uvicorn app.main:create_app --factory --reload --port 8000
```
## Local run (Supabase / Postgres)

Create DB with the provided schema.sql in Supabase (SQL Editor).

Set DATABASE_URL to postgresql+asyncpg://<user>:<pass>@<host>:5432/<db>?sslmode=require in .env.

Run:
```bash
uvicorn app.main:create_app --factory --reload --port 8000
```
## Health

GET /health → { ok: true, ts: "<UTC>" }

## Admin (use header X-Admin-Token: <ADMIN_TOKEN>)

GET /admin/run/liquipedia_ingest

GET /admin/run/build_features

GET /admin/run/model_predict

GET /admin/run/publish_lines

GET /admin/run/vlr_ingest

GET /admin/run/settle_all

POST /admin/team_logo { "team_name":"LOUD","logo_url":"https://..." }

POST /admin/player_avatar { "handle":"aspas","avatar_url":"https://..." }

## Image proxy

GET /img?url=<https%3A%2F%2Fupload.wikimedia.org%2F...>
Allowed hosts come from ALLOWED_IMG_HOSTS.

## Auth

HTTP Basic per request.

Create a user via POST /signup then use its credentials for /entries, /me, etc.

## Lock window

The server rejects entries whose matches start within LOCK_WINDOW_MIN minutes.
