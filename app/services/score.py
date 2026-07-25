from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.entities.score import Score, ScoreHistory, ScorePhase
from app.domain.entities.team import Team, TeamMember


class ScoreService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add_score(
        self,
        team_id: int,
        phase: ScorePhase,
        points: float,
        description: str | None = None,
        reference_id: int | None = None,
        reference_type: str | None = None,
        awarded_by: int | None = None,
    ) -> Score:
        existing = None
        if reference_id and reference_type:
            result = await self.db.execute(
                select(Score).where(
                    Score.team_id == team_id,
                    Score.phase == phase,
                    Score.reference_id == reference_id,
                    Score.reference_type == reference_type,
                )
            )
            existing = result.scalar_one_or_none()

        if existing:
            existing.points = points
            existing.description = description or existing.description
            await self.db.flush()
            await self.db.refresh(existing)
            return existing

        score = Score(
            team_id=team_id,
            phase=phase,
            points=points,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type,
            awarded_by=awarded_by,
        )
        self.db.add(score)
        await self.db.flush()
        await self.db.refresh(score)
        return score

    async def add_bonus_score(
        self,
        team_id: int,
        points: float,
        description: str,
        awarded_by: int | None = None,
    ) -> Score:
        return await self.add_score(
            team_id=team_id,
            phase=ScorePhase.BONUS,
            points=points,
            description=description,
            awarded_by=awarded_by,
        )

    async def add_penalty_score(
        self,
        team_id: int,
        points: float,
        description: str,
        awarded_by: int | None = None,
    ) -> Score:
        return await self.add_score(
            team_id=team_id,
            phase=ScorePhase.PENALTY,
            points=-abs(points),
            description=description,
            awarded_by=awarded_by,
        )

    async def override_score(
        self,
        team_id: int,
        phase: ScorePhase,
        points: float,
        reason: str,
        awarded_by: int | None = None,
    ) -> Score:
        return await self.add_score(
            team_id=team_id,
            phase=phase,
            points=points,
            description=f"Override: {reason}",
            awarded_by=awarded_by,
        )

    async def get_team_scores(
        self, team_id: int, competition_id: int
    ) -> list[Score]:
        result = await self.db.execute(
            select(Score)
            .join(Team)
            .where(
                Score.team_id == team_id,
                Team.competition_id == competition_id,
            )
            .order_by(Score.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_team_score_breakdown(
        self, team_id: int, competition_id: int
    ) -> dict[str, Any]:
        scores = await self.get_team_scores(team_id, competition_id)

        breakdown = {
            ScorePhase.QUIZ: 0.0,
            ScorePhase.DEBUGGING: 0.0,
            ScorePhase.IDEATHON: 0.0,
            ScorePhase.BONUS: 0.0,
            ScorePhase.PENALTY: 0.0,
            ScorePhase.MANUAL: 0.0,
        }

        for score in scores:
            breakdown[score.phase] = breakdown.get(score.phase, 0.0) + score.points

        total = sum(breakdown.values())

        team_result = await self.db.execute(
            select(Team).where(Team.id == team_id)
        )
        team = team_result.scalar_one_or_none()

        return {
            "team_id": team_id,
            "team_name": team.name if team else "Unknown",
            "competition_id": competition_id,
            "total_score": total,
            "quiz_score": breakdown[ScorePhase.QUIZ],
            "debugging_score": breakdown[ScorePhase.DEBUGGING],
            "ideathon_score": breakdown[ScorePhase.IDEATHON],
            "bonus_score": breakdown[ScorePhase.BONUS],
            "penalty_score": breakdown[ScorePhase.PENALTY],
            "manual_score": breakdown[ScorePhase.MANUAL],
            "score_count": len(scores),
        }

    async def get_leaderboard(
        self, competition_id: int, limit: int = 100
    ) -> dict[str, Any]:
        teams_result = await self.db.execute(
            select(Team)
            .where(Team.competition_id == competition_id)
            .options(selectinload(Team.members))
        )
        teams = list(teams_result.scalars().all())

        leaderboard = []
        for team in teams:
            breakdown = await self.get_team_score_breakdown(team.id, competition_id)
            leaderboard.append({
                "team_id": team.id,
                "team_name": team.name,
                "total_score": breakdown["total_score"],
                "quiz_score": breakdown["quiz_score"],
                "debugging_score": breakdown["debugging_score"],
                "ideathon_score": breakdown["ideathon_score"],
                "bonus_score": breakdown["bonus_score"],
                "penalty_score": breakdown["penalty_score"],
                "member_count": team.member_count,
                "is_ready": team.is_ready,
            })

        leaderboard.sort(key=lambda x: x["total_score"], reverse=True)

        for idx, entry in enumerate(leaderboard[:limit], 1):
            entry["rank"] = idx

        return {
            "competition_id": competition_id,
            "total_teams": len(teams),
            "entries": leaderboard[:limit],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    async def get_score_history(
        self, team_id: int, competition_id: int
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(ScoreHistory)
            .join(Team)
            .where(
                ScoreHistory.team_id == team_id,
                Team.competition_id == competition_id,
            )
            .order_by(ScoreHistory.recorded_at.desc())
            .limit(100)
        )
        history = list(result.scalars().all())

        return [
            {
                "id": h.id,
                "total_score": h.total_score,
                "quiz_score": h.quiz_score,
                "debugging_score": h.debugging_score,
                "ideathon_score": h.ideathon_score,
                "bonus_score": h.bonus_score,
                "rank": h.rank,
                "recorded_at": h.recorded_at.isoformat(),
            }
            for h in history
        ]

    async def record_score_snapshot(
        self, competition_id: int
    ) -> int:
        leaderboard = await self.get_leaderboard(competition_id)
        entries = leaderboard["entries"]

        recorded_count = 0
        for entry in entries:
            existing = await self.db.execute(
                select(ScoreHistory).where(
                    ScoreHistory.team_id == entry["team_id"],
                )
                .order_by(ScoreHistory.recorded_at.desc())
                .limit(1)
            )
            last_record = existing.scalar_one_or_none()

            if last_record and last_record.total_score == entry["total_score"]:
                continue

            snapshot = ScoreHistory(
                team_id=entry["team_id"],
                total_score=entry["total_score"],
                quiz_score=entry["quiz_score"],
                debugging_score=entry["debugging_score"],
                ideathon_score=entry["ideathon_score"],
                bonus_score=entry["bonus_score"],
                rank=entry["rank"],
            )
            self.db.add(snapshot)
            recorded_count += 1

        await self.db.flush()
        return recorded_count

    async def get_competition_stats(
        self, competition_id: int
    ) -> dict[str, Any]:
        leaderboard = await self.get_leaderboard(competition_id)
        entries = leaderboard["entries"]

        if not entries:
            return {
                "competition_id": competition_id,
                "total_teams": 0,
                "average_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "median_score": 0,
                "total_points_awarded": 0,
            }

        scores = [e["total_score"] for e in entries]
        scores.sort()

        total_points = sum(scores)
        avg_score = total_points / len(scores)

        median_idx = len(scores) // 2
        median_score = scores[median_idx]

        return {
            "competition_id": competition_id,
            "total_teams": len(entries),
            "average_score": round(avg_score, 2),
            "highest_score": scores[-1],
            "lowest_score": scores[0],
            "median_score": median_score,
            "total_points_awarded": total_points,
        }

    async def get_phase_stats(
        self, competition_id: int
    ) -> dict[str, Any]:
        leaderboard = await self.get_leaderboard(competition_id)
        entries = leaderboard["entries"]

        phase_stats = {
            "quiz": {"total": 0, "teams_with_scores": 0},
            "debugging": {"total": 0, "teams_with_scores": 0},
            "ideathon": {"total": 0, "teams_with_scores": 0},
        }

        for entry in entries:
            if entry["quiz_score"] > 0:
                phase_stats["quiz"]["total"] += entry["quiz_score"]
                phase_stats["quiz"]["teams_with_scores"] += 1

            if entry["debugging_score"] > 0:
                phase_stats["debugging"]["total"] += entry["debugging_score"]
                phase_stats["debugging"]["teams_with_scores"] += 1

            if entry["ideathon_score"] > 0:
                phase_stats["ideathon"]["total"] += entry["ideathon_score"]
                phase_stats["ideathon"]["teams_with_scores"] += 1

        for phase in phase_stats:
            count = phase_stats[phase]["teams_with_scores"]
            if count > 0:
                phase_stats[phase]["average"] = round(
                    phase_stats[phase]["total"] / count, 2
                )
            else:
                phase_stats[phase]["average"] = 0

        return {
            "competition_id": competition_id,
            "phases": phase_stats,
        }
