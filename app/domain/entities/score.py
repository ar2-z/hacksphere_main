from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.team import Team


class ScorePhase(str, enum.Enum):
    QUIZ = "quiz"
    DEBUGGING = "debugging"
    IDEATHON = "ideathon"
    BONUS = "bonus"
    PENALTY = "penalty"
    MANUAL = "manual"


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    phase: Mapped[ScorePhase] = mapped_column(Enum(ScorePhase), nullable=False)
    points: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    awarded_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    team: Mapped[Team] = relationship("Team", back_populates="scores")

    __table_args__ = (
        UniqueConstraint(
            "team_id", "phase", "reference_id", "reference_type",
            name="uq_score_per_reference",
        ),
    )

    def __repr__(self) -> str:
        return f"<Score(id={self.id}, team_id={self.team_id}, phase={self.phase}, points={self.points})>"


class ScoreHistory(Base):
    __tablename__ = "score_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    total_score: Mapped[float] = mapped_column(Float, nullable=False)
    quiz_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    debugging_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ideathon_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    bonus_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    team: Mapped[Team] = relationship("Team")

    def __repr__(self) -> str:
        return f"<ScoreHistory(team_id={self.team_id}, total={self.total_score}, rank={self.rank})>"
