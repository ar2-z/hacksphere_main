from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.quiz import QuizDifficulty, QuizRoundStatus


class QuizQuestionCreate(BaseSchema):
    question_text: str = Field(..., min_length=1)
    question_type: str = Field(default="multiple_choice")
    options: dict = Field(..., min_length=2)
    correct_answer: str
    explanation: str | None = None
    points: int = Field(default=10, ge=1)
    time_limit_seconds: int = Field(default=30, ge=5, le=300)
    order: int = Field(..., ge=1)


class QuizQuestionResponse(BaseSchema):
    id: int
    round_id: int
    question_text: str
    question_type: str
    options: dict
    points: int
    time_limit_seconds: int
    order: int
    is_active: bool


class QuizQuestionWithAnswer(QuizQuestionResponse):
    correct_answer: str
    explanation: str | None = None


class QuizRoundCreate(BaseSchema):
    round_number: int = Field(..., ge=1, le=3)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    difficulty: QuizDifficulty
    time_limit_seconds: int = Field(default=300, ge=60, le=1800)
    points_per_question: int = Field(default=10, ge=1)
    time_bonus_points: int = Field(default=5, ge=0)
    clue_id: int | None = None
    questions: list[QuizQuestionCreate] = []


class QuizRoundResponse(BaseSchema):
    id: int
    competition_id: int
    round_number: int
    name: str
    description: str | None = None
    difficulty: QuizDifficulty
    time_limit_seconds: int
    points_per_question: int
    time_bonus_points: int
    status: QuizRoundStatus
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime
    question_count: int = 0


class QuizRoundWithQuestions(QuizRoundResponse):
    questions: list[QuizQuestionResponse] = []


class QuizSubmitAnswer(BaseSchema):
    question_id: int
    selected_answer: str = Field(..., min_length=1)
    time_taken_seconds: float = Field(..., ge=0)


class QuizAnswerResponse(BaseSchema):
    id: int
    question_id: int
    team_id: int
    selected_answer: str
    is_correct: bool
    points_earned: int
    time_taken_seconds: float
    answered_at: datetime


class QuizRoundResult(BaseSchema):
    round_id: int
    team_id: int
    total_points: int
    correct_answers: int
    total_questions: int
    average_time: float
    answers: list[QuizAnswerResponse] = []
