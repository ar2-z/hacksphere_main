from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery import celery_app
from app.domain.entities.clue import Clue, ClueDistribution
from app.domain.entities.quiz import QuizAnswer, QuizRound, QuizRoundStatus
from app.domain.entities.score import Score, ScorePhase
from app.infrastructure.database.base import async_session_factory


async def _evaluate_round(round_id: int) -> dict:
    async with async_session_factory() as db:
        result = await db.execute(
            select(QuizRound).where(QuizRound.id == round_id)
        )
        round_obj = result.scalar_one_or_none()

        if not round_obj:
            return {"error": "Round not found"}

        answers_result = await db.execute(
            select(QuizAnswer)
            .join(QuizAnswer.question)
            .where(QuizAnswer.question.has(round_id=round_id))
        )
        answers = list(answers_result.scalars().all())

        team_scores: dict[int, float] = {}
        for answer in answers:
            if answer.team_id not in team_scores:
                team_scores[answer.team_id] = 0
            team_scores[answer.team_id] += answer.points_earned

        return {
            "round_id": round_id,
            "total_teams": len(team_scores),
            "total_answers": len(answers),
            "team_scores": team_scores,
        }


async def _reveal_clue_for_teams(round_id: int) -> dict:
    async with async_session_factory() as db:
        result = await db.execute(
            select(QuizRound).where(QuizRound.id == round_id)
        )
        round_obj = result.scalar_one_or_none()

        if not round_obj or not round_obj.clue_id:
            return {"message": "No clue to reveal"}

        clue_result = await db.execute(
            select(Clue).where(Clue.id == round_obj.clue_id)
        )
        clue = clue_result.scalar_one_or_none()

        if not clue:
            return {"error": "Clue not found"}

        from app.domain.entities.team import TeamMember
        teams_result = await db.execute(
            select(TeamMember.team_id)
            .where(TeamMember.team_id.isnot(None))
            .distinct()
        )
        team_ids = [row[0] for row in teams_result.all()]

        revealed_count = 0
        for team_id in team_ids:
            existing = await db.execute(
                select(ClueDistribution).where(
                    ClueDistribution.clue_id == clue.id,
                    ClueDistribution.team_id == team_id,
                )
            )
            if existing.scalar_one_or_none():
                continue

            distribution = ClueDistribution(
                clue_id=clue.id,
                team_id=team_id,
                is_revealed=True,
                revealed_at=datetime.now(timezone.utc),
                earned_by_round=round_obj.round_number,
            )
            db.add(distribution)
            revealed_count += 1

        await db.commit()

        return {
            "clue_id": clue.id,
            "clue_name": clue.name,
            "round_number": round_obj.round_number,
            "teams_revealed": revealed_count,
        }


@celery_app.task(name="quiz.evaluate_round")
def evaluate_quiz_round(round_id: int) -> dict:
    return asyncio.get_event_loop().run_until_complete(_evaluate_round(round_id))


@celery_app.task(name="quiz.reveal_clue")
def reveal_clue_after_round(round_id: int) -> dict:
    return asyncio.get_event_loop().run_until_complete(_reveal_clue_for_teams(round_id))


@celery_app.task(name="quiz.end_round_automatically")
def auto_end_round(round_id: int) -> dict:
    async def _end_round():
        async with async_session_factory() as db:
            result = await db.execute(
                select(QuizRound).where(QuizRound.id == round_id)
            )
            round_obj = result.scalar_one_or_none()

            if not round_obj:
                return {"error": "Round not found"}

            if round_obj.status != QuizRoundStatus.ACTIVE:
                return {"message": "Round is not active"}

            round_obj.status = QuizRoundStatus.COMPLETED
            round_obj.ended_at = datetime.now(timezone.utc)
            await db.commit()

            return await _evaluate_round(round_id)

    return asyncio.get_event_loop().run_until_complete(_end_round())
