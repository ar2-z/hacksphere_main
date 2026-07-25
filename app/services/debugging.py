from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.entities.debugging import (
    DebugChallenge,
    DebugDifficulty,
    DebugRoundStatus,
    DebugSubmission,
    DebugSubmissionStatus,
    DebugTestCase,
)
from app.domain.entities.score import Score, ScorePhase
from app.infrastructure.sandbox.evaluator import CodeEvaluator
from app.infrastructure.sandbox.executor import CodeExecutor


class DebuggingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.executor = CodeExecutor()
        self.evaluator = CodeEvaluator()

    async def create_challenge(
        self,
        competition_id: int,
        round_number: int,
        name: str,
        description: str,
        difficulty: DebugDifficulty,
        buggy_code: str,
        instructions: str,
        time_limit_seconds: int = 600,
        memory_limit_mb: int = 256,
        points: int = 100,
        clue_id: int | None = None,
        test_cases: list[dict[str, Any]] | None = None,
    ) -> DebugChallenge:
        existing = await self.db.execute(
            select(DebugChallenge).where(
                DebugChallenge.competition_id == competition_id,
                DebugChallenge.round_number == round_number,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Round {round_number} already exists for this competition")

        challenge = DebugChallenge(
            competition_id=competition_id,
            round_number=round_number,
            name=name,
            description=description,
            difficulty=difficulty,
            buggy_code=buggy_code,
            instructions=instructions,
            time_limit_seconds=time_limit_seconds,
            memory_limit_mb=memory_limit_mb,
            points=points,
            clue_id=clue_id,
        )
        self.db.add(challenge)
        await self.db.flush()

        if test_cases:
            for tc in test_cases:
                test_case = DebugTestCase(
                    challenge_id=challenge.id,
                    name=tc["name"],
                    input_data=tc["input_data"],
                    expected_output=tc["expected_output"],
                    is_hidden=tc.get("is_hidden", False),
                    points=tc.get("points", 10),
                    order=tc["order"],
                )
                self.db.add(test_case)

        await self.db.flush()
        await self.db.refresh(challenge)
        return challenge

    async def get_challenge(self, challenge_id: int) -> DebugChallenge | None:
        result = await self.db.execute(
            select(DebugChallenge)
            .options(selectinload(DebugChallenge.test_cases))
            .where(DebugChallenge.id == challenge_id)
        )
        return result.scalar_one_or_none()

    async def get_competition_challenges(
        self, competition_id: int
    ) -> list[DebugChallenge]:
        result = await self.db.execute(
            select(DebugChallenge)
            .where(DebugChallenge.competition_id == competition_id)
            .order_by(DebugChallenge.round_number)
        )
        return list(result.scalars().all())

    async def start_challenge(self, challenge_id: int) -> DebugChallenge:
        challenge = await self.get_challenge(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")

        if challenge.status != DebugRoundStatus.PENDING:
            raise ValueError(f"Cannot start challenge in {challenge.status} status")

        challenge.status = DebugRoundStatus.ACTIVE
        challenge.started_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(challenge)
        return challenge

    async def pause_challenge(self, challenge_id: int) -> DebugChallenge:
        challenge = await self.get_challenge(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")

        if challenge.status != DebugRoundStatus.ACTIVE:
            raise ValueError("Can only pause active challenges")

        challenge.status = DebugRoundStatus.PAUSED
        await self.db.flush()
        await self.db.refresh(challenge)
        return challenge

    async def resume_challenge(self, challenge_id: int) -> DebugChallenge:
        challenge = await self.get_challenge(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")

        if challenge.status != DebugRoundStatus.PAUSED:
            raise ValueError("Can only resume paused challenges")

        challenge.status = DebugRoundStatus.ACTIVE
        await self.db.flush()
        await self.db.refresh(challenge)
        return challenge

    async def end_challenge(self, challenge_id: int) -> DebugChallenge:
        challenge = await self.get_challenge(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")

        if challenge.status not in (DebugRoundStatus.ACTIVE, DebugRoundStatus.PAUSED):
            raise ValueError("Can only end active or paused challenges")

        challenge.status = DebugRoundStatus.COMPLETED
        challenge.ended_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(challenge)
        return challenge

    async def submit_code(
        self,
        challenge_id: int,
        team_id: int,
        submitted_code: str,
    ) -> DebugSubmission:
        challenge = await self.get_challenge(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")

        if challenge.status != DebugRoundStatus.ACTIVE:
            raise ValueError("Challenge is not active")

        existing = await self.db.execute(
            select(DebugSubmission).where(
                DebugSubmission.challenge_id == challenge_id,
                DebugSubmission.team_id == team_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already submitted for this challenge")

        submission = DebugSubmission(
            challenge_id=challenge_id,
            team_id=team_id,
            submitted_code=submitted_code,
            status=DebugSubmissionStatus.RUNNING,
        )
        self.db.add(submission)
        await self.db.flush()

        await self._evaluate_submission(submission, challenge)

        return submission

    async def _evaluate_submission(
        self,
        submission: DebugSubmission,
        challenge: DebugChallenge,
    ) -> None:
        is_valid, message = self.executor.validate_code(submission.submitted_code)
        if not is_valid:
            submission.status = DebugSubmissionStatus.COMPILATION_ERROR
            submission.error_message = message
            await self.db.flush()
            return

        public_tests = [tc for tc in challenge.test_cases if not tc.is_hidden]
        test_results = await self.executor.run_test_cases(
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

        hidden_tests = [tc for tc in challenge.test_cases if tc.is_hidden]
        hidden_results = await self.executor.run_test_cases(
            submission.submitted_code,
            [
                {
                    "id": tc.id,
                    "name": tc.name,
                    "input_data": tc.input_data,
                    "expected_output": tc.expected_output,
                    "points": tc.points,
                }
                for tc in hidden_tests
            ],
        )

        hidden_passed = sum(1 for r in hidden_results if r["passed"])
        total_hidden_points = sum(r["points"] for r in hidden_tests)

        metrics = self.evaluator.evaluate_quality(submission.submitted_code)

        correctness_score = (total_points / max(1, sum(tc.points for tc in public_tests))) * 100
        hidden_bonus = (hidden_passed / max(1, len(hidden_tests))) * 50

        final_score = int(
            (correctness_score * 0.6)
            + (metrics.quality_score * 0.2)
            + (metrics.readability_score * 0.1)
            + (metrics.efficiency_score * 0.1)
        )

        submission.status = DebugSubmissionStatus.ACCEPTED if all_passed else DebugSubmissionStatus.WRONG_ANSWER
        submission.score = final_score
        submission.quality_score = metrics.quality_score
        submission.readability_score = metrics.readability_score
        submission.efficiency_score = metrics.efficiency_score
        submission.test_results = {
            "public": test_results,
            "hidden_passed": hidden_passed,
            "hidden_total": len(hidden_tests),
            "correctness_score": correctness_score,
            "hidden_bonus": hidden_bonus,
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
        self.db.add(score)

        await self.db.flush()

    async def get_challenge_results(
        self, challenge_id: int, team_id: int
    ) -> DebugSubmission | None:
        result = await self.db.execute(
            select(DebugSubmission).where(
                DebugSubmission.challenge_id == challenge_id,
                DebugSubmission.team_id == team_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_challenge_leaderboard(
        self, challenge_id: int
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(DebugSubmission)
            .where(DebugSubmission.challenge_id == challenge_id)
            .order_by(DebugSubmission.score.desc())
        )
        submissions = list(result.scalars().all())

        leaderboard = []
        for rank, sub in enumerate(submissions, 1):
            leaderboard.append({
                "rank": rank,
                "team_id": sub.team_id,
                "score": sub.score,
                "status": sub.status.value,
                "quality_score": sub.quality_score,
                "readability_score": sub.readability_score,
                "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            })

        return leaderboard

    async def get_team_progress(
        self, competition_id: int, team_id: int
    ) -> dict[str, Any]:
        challenges = await self.get_competition_challenges(competition_id)

        challenges_data = []
        for challenge in challenges:
            submission = await self.get_challenge_results(challenge.id, team_id)
            challenges_data.append({
                "challenge_id": challenge.id,
                "round_number": challenge.round_number,
                "name": challenge.name,
                "difficulty": challenge.difficulty.value,
                "status": challenge.status.value,
                "submitted": submission is not None,
                "score": submission.score if submission else 0,
                "submission_status": submission.status.value if submission else None,
            })

        total_score = sum(c["score"] for c in challenges_data)

        return {
            "competition_id": competition_id,
            "team_id": team_id,
            "total_score": total_score,
            "challenges": challenges_data,
        }
