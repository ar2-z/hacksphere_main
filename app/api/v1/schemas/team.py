from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.team import TeamMemberRole


class TeamCreate(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    competition_id: int


class TeamUpdate(BaseSchema):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class TeamJoin(BaseSchema):
    team_code: str = Field(..., min_length=8, max_length=8)


class TeamMemberResponse(BaseSchema):
    id: int
    user_id: int
    role: TeamMemberRole
    joined_at: datetime
    user_name: str | None = None
    user_email: str | None = None


class TeamResponse(BaseSchema):
    id: int
    name: str
    description: str | None = None
    team_code: str
    competition_id: int
    max_members: int
    is_ready: bool
    presentation_order: int | None = None
    member_count: int = 0
    members: list[TeamMemberResponse] = []
    created_at: datetime


class TeamReady(BaseSchema):
    is_ready: bool = True
