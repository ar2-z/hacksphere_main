from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.entities.clue import Clue, ClueDistribution
from app.domain.entities.quiz import (
    QuizAnswer,
    QuizDifficulty,
    QuizQuestion,
    QuizRound,
    QuizRoundStatus,
)
from app.domain.entities.score import Score, ScorePhase
from app.domain.entities.team import Team


class QuizService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_round(
        self,
        competition_id: int,
        round_number: int,
        name: str,
        difficulty: QuizDifficulty,
        time_limit_seconds: int = 300,
        points_per_question: int = 10,
        time_bonus_points: int = 5,
        description: str | None = None,
        clue_id: int | None = None,
    ) -> QuizRound:
        existing = await self.db.execute(
            select(QuizRound).where(
                QuizRound.competition_id == competition_id,
                QuizRound.round_number == round_number,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Round {round_number} already exists for this competition")

        round_obj = QuizRound(
            competition_id=competition_id,
            round_number=round_number,
            name=name,
            description=description,
            difficulty=difficulty,
            time_limit_seconds=time_limit_seconds,
            points_per_question=points_per_question,
            time_bonus_points=time_bonus_points,
            clue_id=clue_id,
        )
        self.db.add(round_obj)
        await self.db.flush()
        await self.db.refresh(round_obj)
        return round_obj

    async def add_question(
        self,
        round_id: int,
        question_text: str,
        options: dict,
        correct_answer: str,
        order: int,
        question_type: str = "multiple_choice",
        points: int = 10,
        time_limit_seconds: int = 30,
        explanation: str | None = None,
    ) -> QuizQuestion:
        question = QuizQuestion(
            round_id=round_id,
            question_text=question_text,
            question_type=question_type,
            options=options,
            correct_answer=correct_answer,
            explanation=explanation,
            points=points,
            time_limit_seconds=time_limit_seconds,
            order=order,
        )
        self.db.add(question)
        await self.db.flush()
        await self.db.refresh(question)
        return question

    async def get_round(self, round_id: int) -> QuizRound | None:
        result = await self.db.execute(
            select(QuizRound)
            .options(selectinload(QuizRound.questions))
            .where(QuizRound.id == round_id)
        )
        return result.scalar_one_or_none()

    async def get_round_with_questions(self, round_id: int) -> QuizRound | None:
        result = await self.db.execute(
            select(QuizRound)
            .options(selectinload(QuizRound.questions))
            .where(QuizRound.id == round_id)
        )
        return result.scalar_one_or_none()

    async def get_competition_rounds(
        self, competition_id: int
    ) -> list[QuizRound]:
        result = await self.db.execute(
            select(QuizRound)
            .where(QuizRound.competition_id == competition_id)
            .order_by(QuizRound.round_number)
        )
        return list(result.scalars().all())

    async def start_round(self, round_id: int) -> QuizRound:
        round_obj = await self.get_round(round_id)
        if not round_obj:
            raise ValueError("Round not found")

        if round_obj.status != QuizRoundStatus.PENDING:
            raise ValueError(f"Cannot start round in {round_obj.status} status")

        round_obj.status = QuizRoundStatus.ACTIVE
        round_obj.started_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(round_obj)
        return round_obj

    async def pause_round(self, round_id: int) -> QuizRound:
        round_obj = await self.get_round(round_id)
        if not round_obj:
            raise ValueError("Round not found")

        if round_obj.status != QuizRoundStatus.ACTIVE:
            raise ValueError("Can only pause active rounds")

        round_obj.status = QuizRoundStatus.PAUSED
        await self.db.flush()
        await self.db.refresh(round_obj)
        return round_obj

    async def resume_round(self, round_id: int) -> QuizRound:
        round_obj = await self.get_round(round_id)
        if not round_obj:
            raise ValueError("Round not found")

        if round_obj.status != QuizRoundStatus.PAUSED:
            raise ValueError("Can only resume paused rounds")

        round_obj.status = QuizRoundStatus.ACTIVE
        await self.db.flush()
        await self.db.refresh(round_obj)
        return round_obj

    async def end_round(self, round_id: int) -> QuizRound:
        round_obj = await self.get_round(round_id)
        if not round_obj:
            raise ValueError("Round not found")

        if round_obj.status not in (QuizRoundStatus.ACTIVE, QuizRoundStatus.PAUSED):
            raise ValueError("Can only end active or paused rounds")

        round_obj.status = QuizRoundStatus.COMPLETED
        round_obj.ended_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(round_obj)
        return round_obj

    async def submit_answer(
        self,
        question_id: int,
        team_id: int,
        selected_answer: str,
        time_taken_seconds: float,
    ) -> QuizAnswer:
        question = await self.db.execute(
            select(QuizQuestion).where(QuizQuestion.id == question_id)
        )
        question_obj = question.scalar_one_or_none()
        if not question_obj:
            raise ValueError("Question not found")

        round_obj = await self.get_round(question_obj.round_id)
        if not round_obj:
            raise ValueError("Round not found")

        if round_obj.status != QuizRoundStatus.ACTIVE:
            raise ValueError("Round is not active")

        existing = await self.db.execute(
            select(QuizAnswer).where(
                QuizAnswer.question_id == question_id,
                QuizAnswer.team_id == team_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already answered this question")

        is_correct = selected_answer.strip().upper() == question_obj.correct_answer.strip().upper()

        points_earned = 0
        if is_correct:
            points_earned = question_obj.points
            time_bonus = max(
                0,
                round_obj.time_bonus_points * (1 - time_taken_seconds / question_obj.time_limit_seconds)
            )
            points_earned += int(time_bonus)

        answer = QuizAnswer(
            question_id=question_id,
            team_id=team_id,
            selected_answer=selected_answer,
            is_correct=is_correct,
            points_earned=points_earned,
            time_taken_seconds=time_taken_seconds,
        )
        self.db.add(answer)

        score = Score(
            team_id=team_id,
            phase=ScorePhase.QUIZ,
            points=points_earned,
            description=f"Quiz Round {round_obj.round_number} - Question {question_obj.order}",
            reference_id=question_id,
            reference_type="quiz_answer",
        )
        self.db.add(score)

        await self.db.flush()
        await self.db.refresh(answer)
        return answer

    async def get_round_results(
        self, round_id: int, team_id: int
    ) -> dict[str, Any]:
        answers_result = await self.db.execute(
            select(QuizAnswer)
            .join(QuizQuestion)
            .where(
                QuizAnswer.team_id == team_id,
                QuizQuestion.round_id == round_id,
            )
            .order_by(QuizQuestion.order)
        )
        answers = list(answers_result.scalars().all())

        total_points = sum(a.points_earned for a in answers)
        correct_count = sum(1 for a in answers if a.is_correct)

        round_obj = await self.get_round(round_id)
        total_questions = len(round_obj.questions) if round_obj else 0

        avg_time = (
            sum(a.time_taken_seconds for a in answers) / len(answers)
            if answers
            else 0
        )

        return {
            "round_id": round_id,
            "team_id": team_id,
            "total_points": total_points,
            "correct_answers": correct_count,
            "total_questions": total_questions,
            "average_time": round(avg_time, 2),
            "answers": answers,
        }

    async def get_round_leaderboard(
        self, round_id: int
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(
                QuizAnswer.team_id,
                func.sum(QuizAnswer.points_earned).label("total_points"),
                func.count(QuizAnswer.id).filter(QuizAnswer.is_correct).label("correct"),
                func.count(QuizAnswer.id).label("total_answers"),
                func.avg(QuizAnswer.time_taken_seconds).label("avg_time"),
            )
            .join(QuizQuestion)
            .where(QuizQuestion.round_id == round_id)
            .group_by(QuizAnswer.team_id)
            .order_by(func.sum(QuizAnswer.points_earned).desc())
        )

        leaderboard = []
        for rank, row in enumerate(result.all(), 1):
            leaderboard.append({
                "rank": rank,
                "team_id": row.team_id,
                "total_points": row.total_points,
                "correct_answers": row.correct,
                "total_answers": row.total_answers,
                "average_time": round(row.avg_time, 2) if row.avg_time else 0,
            })

        return leaderboard

    async def get_team_progress(
        self, competition_id: int, team_id: int
    ) -> dict[str, Any]:
        rounds = await self.get_competition_rounds(competition_id)

        rounds_data = []
        for round_obj in rounds:
            answers_result = await self.db.execute(
                select(QuizAnswer)
                .join(QuizQuestion)
                .where(
                    QuizAnswer.team_id == team_id,
                    QuizQuestion.round_id == round_obj.id,
                )
            )
            answers = list(answers_result.scalars().all())

            rounds_data.append({
                "round_id": round_obj.id,
                "round_number": round_obj.round_number,
                "name": round_obj.name,
                "difficulty": round_obj.difficulty.value,
                "status": round_obj.status.value,
                "questions_answered": len(answers),
                "total_points": sum(a.points_earned for a in answers),
                "correct_answers": sum(1 for a in answers if a.is_correct),
            })

        total_points = sum(r["total_points"] for r in rounds_data)

        return {
            "competition_id": competition_id,
            "team_id": team_id,
            "total_points": total_points,
            "rounds": rounds_data,
        }
