from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database.base import Base

if TYPE_CHECKING:
    from app.domain.entities.competition import Competition
    from app.domain.entities.team import Team


class ClueType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    CODE_SNIPPET = "code_snippet"
    HINT = "hint"
    RIDDLE = "riddle"


class ClueSourcePhase(str, enum.Enum):
    QUIZ = "quiz"
    DEBUGGING = "debugging"
    IDEATHON = "ideathon"
    MANUAL = "manual"


class Clue(Base):
    __tablename__ = "clues"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    clue_type: Mapped[ClueType] = mapped_column(Enum(ClueType), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    source_phase: Mapped[ClueSourcePhase] = mapped_column(
        Enum(ClueSourcePhase), nullable=False
    )
    source_round: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    competition: Mapped[Competition] = relationship("Competition", back_populates="clues")
    distributions: Mapped[list[ClueDistribution]] = relationship(
        "ClueDistribution", back_populates="clue", lazy="selectin",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Clue(id={self.id}, name={self.name}, phase={self.source_phase})>"


class ClueDistribution(Base):
    __tablename__ = "clue_distributions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    clue_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("clues.id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    is_revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revealed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    earned_by_round: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    clue: Mapped[Clue] = relationship("Clue", back_populates="distributions")
    team: Mapped[Team] = relationship("Team")

    __table_args__ = (
        UniqueConstraint("clue_id", "team_id", name="uq_clue_distribution"),
    )

    def __repr__(self) -> str:
        return f"<ClueDistribution(clue_id={self.clue_id}, team_id={self.team_id}, revealed={self.is_revealed})>"
