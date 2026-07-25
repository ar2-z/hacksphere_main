from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.competition import CompetitionPhaseStatus, CompetitionPhaseType, CompetitionStatus


class CompetitionCreate(BaseSchema):
    name: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    theme: str | None = Field(default=None, max_length=255)
    max_teams: int = Field(default=100, ge=2)
    team_min_size: int = Field(default=2, ge=1)
    team_max_size: int = Field(default=4, ge=2)
    registration_start: datetime | None = None
    registration_end: datetime | None = None
    event_start: datetime | None = None
    event_end: datetime | None = None


class CompetitionUpdate(BaseSchema):
    name: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    theme: str | None = None
    status: CompetitionStatus | None = None
    max_teams: int | None = Field(default=None, ge=2)
    team_min_size: int | None = Field(default=None, ge=1)
    team_max_size: int | None = Field(default=None, ge=2)
    registration_start: datetime | None = None
    registration_end: datetime | None = None
    event_start: datetime | None = None
    event_end: datetime | None = None


class CompetitionPhaseCreate(BaseSchema):
    phase_type: CompetitionPhaseType
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    order: int = Field(..., ge=1)
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class CompetitionPhaseResponse(BaseSchema):
    id: int
    competition_id: int
    phase_type: CompetitionPhaseType
    name: str
    description: str | None = None
    order: int
    status: CompetitionPhaseStatus
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    created_at: datetime


class CompetitionResponse(BaseSchema):
    id: int
    name: str
    description: str | None = None
    theme: str | None = None
    status: CompetitionStatus
    max_teams: int
    team_min_size: int
    team_max_size: int
    registration_start: datetime | None = None
    registration_end: datetime | None = None
    event_start: datetime | None = None
    event_end: datetime | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    phases: list[CompetitionPhaseResponse] = []


class CompetitionStatusUpdate(BaseSchema):
    status: CompetitionStatus
