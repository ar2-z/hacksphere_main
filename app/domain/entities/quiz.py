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


class QuizDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class QuizRoundStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class QuizRound(Base):
    __tablename__ = "quiz_rounds"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[QuizDifficulty] = mapped_column(
        Enum(QuizDifficulty), nullable=False
    )
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    status: Mapped[QuizRoundStatus] = mapped_column(
        Enum(QuizRoundStatus), default=QuizRoundStatus.PENDING, nullable=False
    )
    points_per_question: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    time_bonus_points: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    clue_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("clues.id"), nullable=True
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
        "Competition", back_populates="quiz_rounds"
    )
    questions: Mapped[list[QuizQuestion]] = relationship(
        "QuizQuestion", back_populates="round", lazy="selectin",
        cascade="all, delete-orphan", order_by="QuizQuestion.order"
    )

    __table_args__ = (
        UniqueConstraint("competition_id", "round_number", name="uq_quiz_round_number"),
    )

    def __repr__(self) -> str:
        return f"<QuizRound(id={self.id}, round={self.round_number}, difficulty={self.difficulty})>"


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    round_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_rounds.id", ondelete="CASCADE"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(
        String(50), default="multiple_choice", nullable=False
    )
    options: Mapped[dict] = mapped_column(JSON, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    round: Mapped[QuizRound] = relationship("QuizRound", back_populates="questions")
    answers: Mapped[list[QuizAnswer]] = relationship(
        "QuizAnswer", back_populates="question", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<QuizQuestion(id={self.id}, order={self.order})>"


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    selected_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    is_correct: Mapped[bool] = mapped_column(nullable=False)
    points_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_taken_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    question: Mapped[QuizQuestion] = relationship("QuizQuestion", back_populates="answers")
    team: Mapped[Team] = relationship("Team")

    __table_args__ = (
        UniqueConstraint("question_id", "team_id", name="uq_quiz_answer_per_team"),
    )

    def __repr__(self) -> str:
        return f"<QuizAnswer(question_id={self.question_id}, team_id={self.team_id})>"
