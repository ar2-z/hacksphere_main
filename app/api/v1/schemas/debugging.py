from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.debugging import DebugDifficulty, DebugRoundStatus, DebugSubmissionStatus


class DebugTestCaseCreate(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    input_data: str
    expected_output: str
    is_hidden: bool = False
    points: int = Field(default=10, ge=1)
    order: int = Field(..., ge=1)


class DebugTestCaseResponse(BaseSchema):
    id: int
    challenge_id: int
    name: str
    is_hidden: bool
    points: int
    order: int


class DebugTestCaseWithInput(DebugTestCaseResponse):
    input_data: str
    expected_output: str


class DebugChallengeCreate(BaseSchema):
    round_number: int = Field(..., ge=1, le=3)
    name: str = Field(..., min_length=1, max_length=255)
    description: str
    difficulty: DebugDifficulty
    buggy_code: str
    instructions: str
    time_limit_seconds: int = Field(default=600, ge=60, le=3600)
    memory_limit_mb: int = Field(default=256, ge=64, le=1024)
    points: int = Field(default=100, ge=10)
    clue_id: int | None = None
    test_cases: list[DebugTestCaseCreate] = []


class DebugChallengeResponse(BaseSchema):
    id: int
    competition_id: int
    round_number: int
    name: str
    description: str
    difficulty: DebugDifficulty
    instructions: str
    time_limit_seconds: int
    memory_limit_mb: int
    points: int
    status: DebugRoundStatus
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime
    test_case_count: int = 0


class DebugChallengeWithTests(DebugChallengeResponse):
    buggy_code: str
    test_cases: list[DebugTestCaseResponse] = []


class DebugChallengeForParticipant(DebugChallengeResponse):
    buggy_code: str
    test_cases: list[DebugTestCaseResponse] = []


class DebugSubmitCode(BaseSchema):
    submitted_code: str = Field(..., min_length=1)


class DebugSubmissionResponse(BaseSchema):
    id: int
    challenge_id: int
    team_id: int
    status: DebugSubmissionStatus
    score: int
    execution_time_ms: float | None = None
    memory_used_mb: float | None = None
    test_results: dict | None = None
    quality_score: float
    readability_score: float
    efficiency_score: float | None = None
    error_message: str | None = None
    submitted_at: datetime
    evaluated_at: datetime | None = None


class DebugSubmissionWithCode(DebugSubmissionResponse):
    submitted_code: str
