from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.team import Team
    from app.domain.entities.quiz import QuizRound
    from app.domain.entities.debugging import DebugChallenge
    from app.domain.entities.ideathon import Presentation
    from app.domain.entities.clue import Clue
    from app.domain.entities.announcement import Announcement


class CompetitionStatus(str, enum.Enum):
    DRAFT = "draft"
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSED = "registration_closed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class CompetitionPhaseType(str, enum.Enum):
    QUIZ = "quiz"
    DEBUGGING = "debugging"
    IDEATHON = "ideathon"


class CompetitionPhaseStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    theme: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[CompetitionStatus] = mapped_column(
        Enum(CompetitionStatus), default=CompetitionStatus.DRAFT, nullable=False
    )
    max_teams: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    team_min_size: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    team_max_size: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    registration_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    registration_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    event_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    event_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    phases: Mapped[list[CompetitionPhase]] = relationship(
        "CompetitionPhase", back_populates="competition", lazy="selectin",
        cascade="all, delete-orphan", order_by="CompetitionPhase.order"
    )
    teams: Mapped[list[Team]] = relationship(
        "Team", back_populates="competition", lazy="selectin"
    )
    quiz_rounds: Mapped[list[QuizRound]] = relationship(
        "QuizRound", back_populates="competition", lazy="selectin"
    )
    debug_challenges: Mapped[list[DebugChallenge]] = relationship(
        "DebugChallenge", back_populates="competition", lazy="selectin"
    )
    presentations: Mapped[list[Presentation]] = relationship(
        "Presentation", back_populates="competition", lazy="selectin"
    )
    clues: Mapped[list[Clue]] = relationship(
        "Clue", back_populates="competition", lazy="selectin"
    )
    announcements: Mapped[list[Announcement]] = relationship(
        "Announcement", back_populates="competition", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Competition(id={self.id}, name={self.name}, status={self.status})>"


class CompetitionPhase(Base):
    __tablename__ = "competition_phases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    phase_type: Mapped[CompetitionPhaseType] = mapped_column(
        Enum(CompetitionPhaseType), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[CompetitionPhaseStatus] = mapped_column(
        Enum(CompetitionPhaseStatus), default=CompetitionPhaseStatus.PENDING, nullable=False
    )
    starts_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    competition: Mapped[Competition] = relationship("Competition", back_populates="phases")

    def __repr__(self) -> str:
        return f"<CompetitionPhase(id={self.id}, type={self.phase_type}, status={self.status})>"
