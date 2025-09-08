from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from .models import User, Entry, Line, Match
from datetime import datetime, timedelta
from .config import settings

def validate_entry(body):
    if body.stake <= 0:
        raise HTTPException(400, "Stake must be positive")
    if body.payout_rule == "2LEG_3X" and len(body.legs) != 2:
        raise HTTPException(400, "2LEG_3X requires exactly 2 legs")
    if body.payout_rule == "3LEG_5X" and len(body.legs) != 3:
        raise HTTPException(400, "3LEG_5X requires exactly 3 legs")
    seen = set()
    for lg in body.legs:
        if lg.line_id in seen:
            raise HTTPException(400, "Duplicate leg")
        seen.add(lg.line_id)

async def debit_user(db: AsyncSession, user: User, amount: int):
    if user.credits < amount:
        raise HTTPException(400, "Insufficient credits")
    user.credits -= amount
    await db.commit()

# Simplified settlement stub (extend later with real results ingestion)
async def settle_match(db: AsyncSession, match_id: str):
    # For MVP we do nothing (entries remain OPEN until you implement ingest of finals & results).
    return
