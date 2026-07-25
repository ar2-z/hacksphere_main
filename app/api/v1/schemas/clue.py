from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.clue import ClueSourcePhase, ClueType


class ClueCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    clue_type: ClueType
    content: str
    order: int = Field(..., ge=1)
    source_phase: ClueSourcePhase
    source_round: int | None = None
    is_active: bool = True


class ClueUpdate(BaseSchema):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    clue_type: ClueType | None = None
    content: str | None = None
    order: int | None = Field(default=None, ge=1)
    source_phase: ClueSourcePhase | None = None
    source_round: int | None = None
    is_active: bool | None = None


class ClueResponse(BaseSchema):
    id: int
    competition_id: int
    name: str
    description: str | None = None
    clue_type: ClueType
    content: str
    order: int
    source_phase: ClueSourcePhase
    source_round: int | None = None
    is_active: bool
    created_at: datetime


class ClueDistributionResponse(BaseSchema):
    id: int
    clue_id: int
    team_id: int
    is_revealed: bool
    revealed_at: datetime | None = None
    earned_by_round: int | None = None
    created_at: datetime


class ClueRevealRequest(BaseSchema):
    clue_id: int
    team_id: int
    earned_by_round: int | None = None


class TeamCluesResponse(BaseSchema):
    team_id: int
    team_name: str
    total_clues: int
    revealed_clues: int
    clues: list[ClueDistributionResponse] = []
