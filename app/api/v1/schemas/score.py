from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.score import ScorePhase


class ScoreCreate(BaseSchema):
    team_id: int
    phase: ScorePhase
    points: float = Field(..., ge=0)
    description: str | None = None
    reference_id: int | None = None
    reference_type: str | None = None


class ScoreResponse(BaseSchema):
    id: int
    team_id: int
    phase: ScorePhase
    points: float
    description: str | None = None
    reference_id: int | None = None
    reference_type: str | None = None
    awarded_by: int | None = None
    created_at: datetime


class ScoreHistoryResponse(BaseSchema):
    id: int
    team_id: int
    total_score: float
    quiz_score: float
    debugging_score: float
    ideathon_score: float
    bonus_score: float
    rank: int | None = None
    recorded_at: datetime


class LeaderboardEntry(BaseSchema):
    rank: int
    team_id: int
    team_name: str
    total_score: float
    quiz_score: float
    debugging_score: float
    ideathon_score: float
    bonus_score: float
    member_count: int
    is_ready: bool


class LeaderboardResponse(BaseSchema):
    competition_id: int
    total_teams: int
    entries: list[LeaderboardEntry] = []
    updated_at: datetime


class ScoreOverride(BaseSchema):
    team_id: int
    phase: ScorePhase
    points: float
    reason: str = Field(..., min_length=1)
