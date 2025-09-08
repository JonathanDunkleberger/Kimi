from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from .db import init_db
from .config import settings
from .schemas import (
    UserCreate, UserOut, LoginIn,
    BoardResponse, BoardMatch, BoardLine,
    EntryCreate, EntryOut, LineDetail,
    EntriesResponse, EntryListItem, EntryLegOut
)
from .models import User, Match, Team, Player, Line, Entry
from passlib.hash import bcrypt
from .security import get_db, get_current_user, require_admin
from .services import validate_entry, debit_user, settle_match
from .pipelines import run_liquipedia_ingest, run_build_features, run_model_predict, run_publish_lines, run_vlr_ingest

LOCK_WINDOW_MIN = settings.LOCK_WINDOW_MIN

def create_app():
    app = FastAPI(title="Valorant Props MVP", version="0.1.2")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def _startup():
        await init_db()

    @app.get("/health")
    async def health():
        return {"ok": True, "ts": datetime.utcnow().isoformat()}

    # --- Auth & users ---
    @app.post("/signup", response_model=UserOut)
    async def signup(body: UserCreate, db: AsyncSession = Depends(get_db)):
        q = await db.execute(select(User).where(User.username == body.username))
        if q.scalar_one_or_none():
            raise HTTPException(400, "Username taken")
        u = User(username=body.username, password_hash=bcrypt.hash(body.password), credits=settings.INITIAL_CREDITS)
        db.add(u)
        await db.commit()
        return UserOut(id=u.id, username=u.username, credits=u.credits)

    @app.post("/login")
    async def login(_: LoginIn):
        return {"ok": True}

    @app.get("/me", response_model=UserOut)
    async def me(user: User = Depends(get_current_user)):
        return UserOut(id=user.id, username=user.username, credits=user.credits)

    # --- Board & lines ---
    @app.get("/board", response_model=BoardResponse)
    async def board(date: str | None = Query(default=None), db: AsyncSession = Depends(get_db)):
        if date:
            day = datetime.fromisoformat(date + "T00:00:00")
            day2 = day + timedelta(days=1)
        else:
            day = datetime.utcnow()
            day2 = day + timedelta(days=2)
        mq = await db.execute(select(Match).where(Match.starts_at.between(day, day2)))
        matches = mq.scalars().all()
        out = []
        for m in matches:
            t1 = (await db.execute(select(Team).where(Team.id == m.team1_id))).scalar_one_or_none()
            t2 = (await db.execute(select(Team).where(Team.id == m.team2_id))).scalar_one_or_none()
            lq = await db.execute(select(Line).where(Line.match_id == m.id, Line.stat=="kills_match"))
            lines = lq.scalars().all()
            line_out = []
            for ln in lines:
                p = (await db.execute(select(Player).where(Player.id == ln.player_id))).scalar_one_or_none()
                line_out.append(BoardLine(line_id=ln.id, player=p.handle if p else "Unknown",
                                          team=t1.name if p and p.team_id==m.team1_id else (t2.name if p and p.team_id==m.team2_id else None),
                                          stat="kills_match", line_value=ln.line_value, status=ln.status))
            out.append(BoardMatch(match_id=m.id, starts_at=m.starts_at, event=m.event_name, format=m.format,
                                  team1=t1.name if t1 else None, team2=t2.name if t2 else None, lines=line_out))
        return BoardResponse(matches=out)

    @app.get("/lines/{line_id}", response_model=LineDetail)
    async def line_detail(line_id: str, db: AsyncSession = Depends(get_db)):
        l = (await db.execute(select(Line).where(Line.id == line_id))).scalar_one_or_none()
        if not l:
            raise HTTPException(404, "Line not found")
        return LineDetail(line_value=l.line_value, p_over=l.p_over, status=l.status)

    # --- Entries (server-side lock enforced) ---
    @app.post("/entries", response_model=EntryOut)
    async def create_entry(body: EntryCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        validate_entry(body)

        # Load lines -> ensure OPEN and collect match_ids
        leg_objs = []
        match_ids = set()
        for lg in body.legs:
            l = (await db.execute(select(Line).where(Line.id == lg.line_id))).scalar_one_or_none()
            if not l or l.status != "OPEN":
                raise HTTPException(400, "Line unavailable")
            leg_objs.append({"line_id": l.id, "player_id": l.player_id, "match_id": l.match_id,
                             "stat": l.stat, "side": lg.side, "line_value": l.line_value})
            match_ids.add(l.match_id)

        # Lock enforcement: all legs must not be within LOCK_WINDOW_MIN of starts_at
        now = datetime.utcnow()
        for mid in match_ids:
            m = (await db.execute(select(Match).where(Match.id == mid))).scalar_one_or_none()
            if not m:
                raise HTTPException(400, "Match not found")
            if m.starts_at - timedelta(minutes=LOCK_WINDOW_MIN) <= now:
                raise HTTPException(400, "Entries are locked for this match")

        await debit_user(db, user, body.stake)
        e = Entry(user_id=user.id, stake=body.stake, payout_rule=body.payout_rule, legs_json={"legs": leg_objs})
        db.add(e)
        await db.commit()
        return EntryOut(entry_id=e.id, status=e.status, new_credits=user.credits)

    @app.get("/entries", response_model=EntriesResponse)
    async def list_entries(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        q = await db.execute(select(Entry).where(Entry.user_id == user.id).order_by(Entry.created_at.desc()))
        items = []
        for e in q.scalars().all():
            legs_out = []
            for lg in e.legs_json.get("legs", []):
                player = (await db.execute(select(Player).where(Player.id == lg.get("player_id")))).scalar_one_or_none()
                legs_out.append(EntryLegOut(
                    line_id=lg.get("line_id"),
                    player=player.handle if player else None,
                    team=None,  # can enrich later
                    stat=lg.get("stat"),
                    side=lg.get("side"),
                    line_value=float(lg.get("line_value")),
                    result=lg.get("result"),
                    player_final=lg.get("player_final"),
                ))
            items.append(EntryListItem(
                entry_id=e.id,
                created_at=e.created_at,
                settled_at=e.settled_at,
                status=e.status,
                stake=e.stake,
                payout_rule=e.payout_rule,
                legs=legs_out
            ))
        return EntriesResponse(entries=items)

    # --- Admin pipeline triggers ---
    @app.get("/admin/run/liquipedia_ingest")
    async def admin_liquipedia(_: bool = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        await run_liquipedia_ingest(db)
        return {"ok": True}

    @app.get("/admin/run/build_features")
    async def admin_build_features(_: bool = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        await run_build_features(db)
        return {"ok": True}

    @app.get("/admin/run/model_predict")
    async def admin_model_predict(_: bool = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        await run_model_predict(db)
        return {"ok": True}

    @app.get("/admin/run/publish_lines")
    async def admin_publish(_: bool = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        await run_publish_lines(db)
        return {"ok": True}

    @app.get("/admin/run/vlr_ingest")
    async def admin_vlr_ingest(_: bool = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        await run_vlr_ingest(db)
        return {"ok": True}

    @app.get("/admin/run/settle_all")
    async def admin_settle_all(_: bool = Depends(require_admin), db: AsyncSession = Depends(get_db)):
        mq = await db.execute(select(Match).where(Match.status=="FINAL"))
        for m in mq.scalars().all():
            await settle_match(db, m.id)
        return {"ok": True}

    return app
