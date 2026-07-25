from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.announcement import AnnouncementPriority
from app.domain.entities.violation import ViolationAction, ViolationSeverity, ViolationType


class ViolationResponse(BaseSchema):
    id: int
    user_id: int
    team_id: int | None = None
    competition_id: int
    violation_type: ViolationType
    severity: ViolationSeverity
    action_taken: ViolationAction
    description: str | None = None
    extra_data: dict | None = None
    is_resolved: bool
    resolved_by: int | None = None
    resolved_at: datetime | None = None
    created_at: datetime


class ViolationActionUpdate(BaseSchema):
    action_taken: ViolationAction
    reason: str | None = None


class ViolationResolve(BaseSchema):
    is_resolved: bool = True
    notes: str | None = None


class AnnouncementCreate(BaseSchema):
    competition_id: int
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    is_pinned: bool = False
    is_broadcast: bool = True
    target_team_id: int | None = None


class AnnouncementUpdate(BaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1)
    priority: AnnouncementPriority | None = None
    is_pinned: bool | None = None


class AnnouncementResponse(BaseSchema):
    id: int
    competition_id: int
    title: str
    content: str
    priority: AnnouncementPriority
    is_pinned: bool
    is_broadcast: bool
    target_team_id: int | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime


class AuditLogResponse(BaseSchema):
    id: int
    user_id: int
    action: str
    resource_type: str
    resource_id: int | None = None
    details: dict | None = None
    ip_address: str | None = None
    status: str
    created_at: datetime
