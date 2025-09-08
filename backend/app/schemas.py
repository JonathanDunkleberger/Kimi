from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    credits: int

class LoginIn(BaseModel):
    username: str
    password: str

class BoardLine(BaseModel):
    line_id: str
    player: str
    team: str | None = None
    player_avatar_url: str | None = None
    stat: Literal["kills_match"]
    line_value: float
    status: Literal["OPEN","FROZEN","PULLED","SETTLED"]

class BoardMatch(BaseModel):
    match_id: str
    starts_at: datetime
    event: str
    format: str
    team1: str | None = None
    team2: str | None = None
    team1_logo_url: str | None = None
    team2_logo_url: str | None = None
    lines: List[BoardLine] = Field(default_factory=list)

class BoardResponse(BaseModel):
    matches: List[BoardMatch] = Field(default_factory=list)

class EntryLegIn(BaseModel):
    line_id: str
    side: Literal["OVER","UNDER"]

class EntryCreate(BaseModel):
    stake: int
    payout_rule: Literal["2LEG_3X","3LEG_5X"]
    legs: List[EntryLegIn]

class EntryOut(BaseModel):
    entry_id: str
    status: str
    new_credits: int

class LineDetail(BaseModel):
    line_value: float
    p_over: float
    status: str

class EntryLegOut(BaseModel):
    line_id: str
    player: str | None = None
    team: str | None = None
    stat: str
    side: Literal["OVER","UNDER"]
    line_value: float
    result: Optional[Literal["OVER","UNDER","VOID"]] = None
    player_final: Optional[int] = None

class EntryListItem(BaseModel):
    entry_id: str
    created_at: datetime
    settled_at: datetime | None = None
    status: Literal["OPEN","WON","LOST","CANCELLED"]
    stake: int
    payout_rule: Literal["2LEG_3X","3LEG_5X"]
    legs: List[EntryLegOut]

class EntriesResponse(BaseModel):
    entries: List[EntryListItem] = Field(default_factory=list)

# Admin setters
class TeamLogoSetIn(BaseModel):
    team_name: str
    logo_url: str

class PlayerAvatarSetIn(BaseModel):
    handle: str
    avatar_url: str
