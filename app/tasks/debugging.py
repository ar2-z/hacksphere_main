from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery import celery_app
from app.domain.entities.debugging import DebugChallenge, DebugRoundStatus, DebugSubmission
from app.domain.entities.score import Score, ScorePhase
from app.infrastructure.database.base import async_session_factory
from app.infrastructure.sandbox.evaluator import CodeEvaluator
from app.infrastructure.sandbox.executor import CodeExecutor


async def _evaluate_submission_async(submission_id: int) -> dict:
    async with async_session_factory() as db:
        result = await db.execute(
            select(DebugSubmission).where(DebugSubmission.id == submission_id)
        )
        submission = result.scalar_one_or_none()

        if not submission:
            return {"error": "Submission not found"}

        challenge_result = await db.execute(
            select(DebugChallenge).where(DebugChallenge.id == submission.challenge_id)
        )
        challenge = challenge_result.scalar_one_or_none()

        if not challenge:
            return {"error": "Challenge not found"}

        executor = CodeExecutor(
            timeout_seconds=challenge.time_limit_seconds,
            memory_limit_mb=challenge.memory_limit_mb,
        )
        evaluator = CodeEvaluator()

        is_valid, message = executor.validate_code(submission.submitted_code)
        if not is_valid:
            submission.status = "compilation_error"
            submission.error_message = message
            await db.commit()
            return {"status": "compilation_error", "error": message}

        public_tests = [tc for tc in challenge.test_cases if not tc.is_hidden]
        test_results = await executor.run_test_cases(
            submission.submitted_code,
            [
                {
                    "id": tc.id,
                    "name": tc.name,
                    "input_data": tc.input_data,
                    "expected_output": tc.expected_output,
                    "points": tc.points,
                }
                for tc in public_tests
            ],
        )

        all_passed = all(r["passed"] for r in test_results)
        total_points = sum(r["points"] for r in test_results)

        metrics = evaluator.evaluate_quality(submission.submitted_code)

        correctness_score = (total_points / max(1, sum(tc.points for tc in public_tests))) * 100

        final_score = int(
            (correctness_score * 0.6)
            + (metrics.quality_score * 0.2)
            + (metrics.readability_score * 0.1)
            + (metrics.efficiency_score * 0.1)
        )

        submission.status = "accepted" if all_passed else "wrong_answer"
        submission.score = final_score
        submission.quality_score = metrics.quality_score
        submission.readability_score = metrics.readability_score
        submission.efficiency_score = metrics.efficiency_score
        submission.test_results = {
            "public": test_results,
            "correctness_score": correctness_score,
        }
        submission.evaluated_at = datetime.now(timezone.utc)

        score = Score(
            team_id=submission.team_id,
            phase=ScorePhase.DEBUGGING,
            points=final_score,
            description=f"Debug Challenge Round {challenge.round_number}",
            reference_id=challenge.id,
            reference_type="debug_challenge",
        )
        db.add(score)

        await db.commit()

        return {
            "submission_id": submission_id,
            "status": submission.status,
            "score": final_score,
        }


@celery_app.task(name="debugging.evaluate_submission")
def evaluate_submission(submission_id: int) -> dict:
    return asyncio.get_event_loop().run_until_complete(
        _evaluate_submission_async(submission_id)
    )


@celery_app.task(name="debugging.end_challenge_automatically")
def auto_end_challenge(challenge_id: int) -> dict:
    async def _end_challenge():
        async with async_session_factory() as db:
            result = await db.execute(
                select(DebugChallenge).where(DebugChallenge.id == challenge_id)
            )
            challenge = result.scalar_one_or_none()

            if not challenge:
                return {"error": "Challenge not found"}

            if challenge.status != DebugRoundStatus.ACTIVE:
                return {"message": "Challenge is not active"}

            challenge.status = DebugRoundStatus.COMPLETED
            challenge.ended_at = datetime.now(timezone.utc)
            await db.commit()

            return {
                "challenge_id": challenge_id,
                "status": "completed",
                "ended_at": challenge.ended_at.isoformat(),
            }

    return asyncio.get_event_loop().run_until_complete(_end_challenge())
