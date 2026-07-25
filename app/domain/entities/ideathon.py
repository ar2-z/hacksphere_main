from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.competition import Competition
    from app.domain.entities.team import Team


class PresentationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Presentation(Base):
    __tablename__ = "presentations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    idea_summary: Mapped[str] = mapped_column(Text, nullable=False)
    presentation_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    presentation_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[PresentationStatus] = mapped_column(
        Enum(PresentationStatus), default=PresentationStatus.DRAFT, nullable=False
    )
    presentation_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    theme: Mapped[str | None] = mapped_column(String(255), nullable=True)
    problem_category: Mapped[str | None] = mapped_column(String(255), nullable=True)

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ready_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    presented_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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

    competition: Mapped[Competition] = relationship(
        "Competition", back_populates="presentations"
    )
    team: Mapped[Team] = relationship("Team")
    scores: Mapped[list[PresentationScore]] = relationship(
        "PresentationScore", back_populates="presentation", lazy="selectin",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Presentation(id={self.id}, team_id={self.team_id}, status={self.status})>"

    @property
    def total_score(self) -> float:
        return sum(s.score for s in self.scores)


class PresentationScore(Base):
    __tablename__ = "presentation_scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    presentation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("presentations.id", ondelete="CASCADE"), nullable=False
    )
    admin_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    criteria: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    scored_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    presentation: Mapped[Presentation] = relationship(
        "Presentation", back_populates="scores"
    )

    def __repr__(self) -> str:
        return f"<PresentationScore(id={self.id}, category={self.category}, score={self.score})>"
