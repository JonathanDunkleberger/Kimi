import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, ForeignKey, JSON, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

def uid() -> str:
    return uuid.uuid4().hex

# --- Users ---
class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    credits: Mapped[int] = mapped_column(Integer, default=1000)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

# --- Teams ---
class Team(Base):
    __tablename__ = "teams"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String, index=True)
    liquipedia_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    vlr_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)

# --- Players ---
class Player(Base):
    __tablename__ = "players"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    handle: Mapped[str] = mapped_column(String, index=True)
    team_id: Mapped[str | None] = mapped_column(String, ForeignKey("teams.id"), nullable=True)
    liquipedia_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    vlr_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)

# --- Matches ---
class Match(Base):
    __tablename__ = "matches"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    ext_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    format: Mapped[str] = mapped_column(String)  # e.g., BO3
    event_name: Mapped[str] = mapped_column(String)
    team1_id: Mapped[str | None] = mapped_column(String, ForeignKey("teams.id"), nullable=True)
    team2_id: Mapped[str | None] = mapped_column(String, ForeignKey("teams.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="SCHEDULED")  # SCHEDULED|LIVE|FINAL
    liquipedia_url: Mapped[str | None] = mapped_column(String, nullable=True)
    vlr_url: Mapped[str | None] = mapped_column(String, nullable=True)
    roster_lock_snapshot_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

# --- Lines ---
class Line(Base):
    __tablename__ = "lines"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    player_id: Mapped[str] = mapped_column(String, ForeignKey("players.id"))
    match_id: Mapped[str] = mapped_column(String, ForeignKey("matches.id"))
    stat: Mapped[str] = mapped_column(String)  # 'kills_match'
    line_value: Mapped[float] = mapped_column(Float)
    p_over: Mapped[float] = mapped_column(Float, default=0.5)
    shade_bps: Mapped[int] = mapped_column(Integer, default=150)
    status: Mapped[str] = mapped_column(String, default="OPEN")  # OPEN|FROZEN|PULLED|SETTLED
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

# --- Entries ---
class Entry(Base):
    __tablename__ = "entries"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    stake: Mapped[int] = mapped_column(Integer)
    payout_rule: Mapped[str] = mapped_column(String)  # '2LEG_3X'|'3LEG_5X'
    legs_json: Mapped[dict] = mapped_column(JSON)     # { legs: [{ line_id, player_id, match_id, stat, side, line_value, ... }] }
    status: Mapped[str] = mapped_column(String, default="OPEN")  # OPEN|WON|LOST|CANCELLED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    settlement_note: Mapped[str | None] = mapped_column(Text, nullable=True)
