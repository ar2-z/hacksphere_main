from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.competition import Competition
    from app.domain.entities.team import Team


class DebugDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class DebugRoundStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class DebugSubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    MEMORY_LIMIT_EXCEEDED = "memory_limit_exceeded"
    RUNTIME_ERROR = "runtime_error"
    COMPILATION_ERROR = "compilation_error"


class DebugChallenge(Base):
    __tablename__ = "debug_challenges"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[DebugDifficulty] = mapped_column(
        Enum(DebugDifficulty), nullable=False
    )
    buggy_code: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=600, nullable=False)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, default=256, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    clue_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clues.id"), nullable=True
    )
    status: Mapped[DebugRoundStatus] = mapped_column(
        Enum(DebugRoundStatus), default=DebugRoundStatus.PENDING, nullable=False
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    competition: Mapped[Competition] = relationship(
        "Competition", back_populates="debug_challenges"
    )
    test_cases: Mapped[list[DebugTestCase]] = relationship(
        "DebugTestCase", back_populates="challenge", lazy="selectin",
        cascade="all, delete-orphan"
    )
    submissions: Mapped[list[DebugSubmission]] = relationship(
        "DebugSubmission", back_populates="challenge", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint("competition_id", "round_number", name="uq_debug_round_number"),
    )

    def __repr__(self) -> str:
        return f"<DebugChallenge(id={self.id}, round={self.round_number})>"


class DebugTestCase(Base):
    __tablename__ = "debug_test_cases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    challenge_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("debug_challenges.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    input_data: Mapped[str] = mapped_column(Text, nullable=False)
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(default=False, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    challenge: Mapped[DebugChallenge] = relationship("DebugChallenge", back_populates="test_cases")

    def __repr__(self) -> str:
        return f"<DebugTestCase(id={self.id}, name={self.name}, hidden={self.is_hidden})>"


class DebugSubmission(Base):
    __tablename__ = "debug_submissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    challenge_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("debug_challenges.id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    submitted_code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[DebugSubmissionStatus] = mapped_column(
        Enum(DebugSubmissionStatus), default=DebugSubmissionStatus.PENDING, nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    execution_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    memory_used_mb: Mapped[float | None] = mapped_column(Float, nullable=True)
    test_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    quality_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    readability_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    efficiency_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    evaluated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    challenge: Mapped[DebugChallenge] = relationship(
        "DebugChallenge", back_populates="submissions"
    )
    team: Mapped[Team] = relationship("Team")

    __table_args__ = (
        UniqueConstraint(
            "challenge_id", "team_id", name="uq_debug_submission_per_team"
        ),
    )

    def __repr__(self) -> str:
        return f"<DebugSubmission(id={self.id}, status={self.status})>"
