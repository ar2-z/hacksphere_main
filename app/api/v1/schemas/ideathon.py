from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.ideathon import PresentationStatus


class PresentationCreate(BaseSchema):
    competition_id: int
    problem_statement: str = Field(..., min_length=10)
    idea_summary: str = Field(..., min_length=10)
    theme: str | None = None
    problem_category: str | None = None


class PresentationUpdate(BaseSchema):
    problem_statement: str | None = Field(default=None, min_length=10)
    idea_summary: str | None = Field(default=None, min_length=10)
    presentation_file_url: str | None = None
    presentation_file_name: str | None = None
    theme: str | None = None
    problem_category: str | None = None


class PresentationResponse(BaseSchema):
    id: int
    competition_id: int
    team_id: int
    problem_statement: str
    idea_summary: str
    presentation_file_url: str | None = None
    presentation_file_name: str | None = None
    status: PresentationStatus
    presentation_order: int | None = None
    theme: str | None = None
    problem_category: str | None = None
    submitted_at: datetime | None = None
    ready_at: datetime | None = None
    presented_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    total_score: float = 0.0


class PresentationReady(BaseSchema):
    is_ready: bool = True


class PresentationScoreCreate(BaseSchema):
    category: str = Field(..., min_length=1, max_length=100)
    score: float = Field(..., ge=0)
    max_score: float = Field(default=10.0, ge=1)
    feedback: str | None = None
    criteria: dict | None = None


class PresentationScoreResponse(BaseSchema):
    id: int
    presentation_id: int
    admin_id: int
    category: str
    score: float
    max_score: float
    feedback: str | None = None
    criteria: dict | None = None
    scored_at: datetime


class PresentationWithScores(PresentationResponse):
    scores: list[PresentationScoreResponse] = []


class PresentationOrderResponse(BaseSchema):
    team_id: int
    team_name: str
    presentation_order: int
    presentation_id: int
