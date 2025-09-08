import base64
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.hash import bcrypt
from .models import User
from .db import get_db
from .config import settings

def _parse_basic_auth(authorization: str | None):
    if not authorization or not authorization.startswith("Basic "):
        raise HTTPException(401, "Unauthorized")
    try:
        raw = base64.b64decode(authorization.split(" ", 1)[1]).decode("utf-8")
        username, password = raw.split(":", 1)
        return username, password
    except Exception:
        raise HTTPException(401, "Unauthorized")

async def get_current_user(req: Request, db: AsyncSession = Depends(get_db)) -> User:
    username, password = _parse_basic_auth(req.headers.get("Authorization"))
    q = await db.execute(select(User).where(User.username == username))
    u = q.scalar_one_or_none()
    if not u or not bcrypt.verify(password, u.password_hash):
        raise HTTPException(401, "Unauthorized")
    return u

def require_admin(req: Request):
    token = req.headers.get("X-Admin-Token")
    if not token or token != settings.ADMIN_TOKEN:
        raise HTTPException(403, "Forbidden")
    return True
