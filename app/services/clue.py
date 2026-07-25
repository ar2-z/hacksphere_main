from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.entities.clue import (
    Clue,
    ClueDistribution,
    ClueSourcePhase,
    ClueType,
)
from app.domain.entities.debugging import DebugChallenge, DebugRoundStatus
from app.domain.entities.quiz import QuizRound, QuizRoundStatus
from app.domain.entities.team import Team, TeamMember


class ClueService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_clue(
        self,
        competition_id: int,
        name: str,
        clue_type: ClueType,
        content: str,
        order: int,
        source_phase: ClueSourcePhase,
        description: str | None = None,
        source_round: int | None = None,
        is_active: bool = True,
    ) -> Clue:
        clue = Clue(
            competition_id=competition_id,
            name=name,
            description=description,
            clue_type=clue_type,
            content=content,
            order=order,
            source_phase=source_phase,
            source_round=source_round,
            is_active=is_active,
        )
        self.db.add(clue)
        await self.db.flush()
        await self.db.refresh(clue)
        return clue

    async def update_clue(
        self, clue_id: int, **kwargs: dict
    ) -> Clue:
        result = await self.db.execute(
            select(Clue).where(Clue.id == clue_id)
        )
        clue = result.scalar_one_or_none()

        if not clue:
            raise ValueError("Clue not found")

        for key, value in kwargs.items():
            if hasattr(clue, key) and value is not None:
                setattr(clue, key, value)

        await self.db.flush()
        await self.db.refresh(clue)
        return clue

    async def delete_clue(self, clue_id: int) -> bool:
        result = await self.db.execute(
            select(Clue).where(Clue.id == clue_id)
        )
        clue = result.scalar_one_or_none()

        if not clue:
            return False

        await self.db.delete(clue)
        await self.db.flush()
        return True

    async def get_clue(self, clue_id: int) -> Clue | None:
        result = await self.db.execute(
            select(Clue)
            .options(selectinload(Clue.distributions))
            .where(Clue.id == clue_id)
        )
        return result.scalar_one_or_none()

    async def get_competition_clues(
        self, competition_id: int
    ) -> list[Clue]:
        result = await self.db.execute(
            select(Clue)
            .where(Clue.competition_id == competition_id)
            .order_by(Clue.order)
        )
        return list(result.scalars().all())

    async def get_clues_by_phase(
        self, competition_id: int, source_phase: ClueSourcePhase
    ) -> list[Clue]:
        result = await self.db.execute(
            select(Clue)
            .where(
                Clue.competition_id == competition_id,
                Clue.source_phase == source_phase,
            )
            .order_by(Clue.order)
        )
        return list(result.scalars().all())

    async def reveal_clue_to_team(
        self,
        clue_id: int,
        team_id: int,
        earned_by_round: int | None = None,
    ) -> ClueDistribution:
        clue = await self.get_clue(clue_id)
        if not clue:
            raise ValueError("Clue not found")

        if not clue.is_active:
            raise ValueError("Clue is not active")

        existing = await self.db.execute(
            select(ClueDistribution).where(
                ClueDistribution.clue_id == clue_id,
                ClueDistribution.team_id == team_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Clue already revealed to this team")

        distribution = ClueDistribution(
            clue_id=clue_id,
            team_id=team_id,
            is_revealed=True,
            revealed_at=datetime.now(timezone.utc),
            earned_by_round=earned_by_round,
        )
        self.db.add(distribution)
        await self.db.flush()
        await self.db.refresh(distribution)
        return distribution

    async def bulk_reveal_clues(
        self,
        clue_ids: list[int],
        team_id: int,
        earned_by_round: int | None = None,
    ) -> list[ClueDistribution]:
        distributions = []
        for clue_id in clue_ids:
            try:
                dist = await self.reveal_clue_to_team(
                    clue_id, team_id, earned_by_round
                )
                distributions.append(dist)
            except ValueError:
                continue
        return distributions

    async def get_team_clues(
        self, team_id: int, competition_id: int
    ) -> dict[str, Any]:
        all_clues = await self.get_competition_clues(competition_id)

        result = await self.db.execute(
            select(ClueDistribution)
            .join(Clue)
            .where(
                ClueDistribution.team_id == team_id,
                Clue.competition_id == competition_id,
            )
        )
        distributions = {d.clue_id: d for d in result.scalars().all()}

        revealed_clues = []
        unrevealed_clues = []

        for clue in all_clues:
            dist = distributions.get(clue.id)
            if dist and dist.is_revealed:
                revealed_clues.append({
                    "clue_id": clue.id,
                    "name": clue.name,
                    "description": clue.description,
                    "clue_type": clue.clue_type.value,
                    "content": clue.content,
                    "order": clue.order,
                    "source_phase": clue.source_phase.value,
                    "source_round": clue.source_round,
                    "revealed_at": dist.revealed_at.isoformat() if dist.revealed_at else None,
                    "earned_by_round": dist.earned_by_round,
                })
            else:
                unrevealed_clues.append({
                    "clue_id": clue.id,
                    "name": "???",
                    "order": clue.order,
                    "source_phase": clue.source_phase.value,
                })

        team_result = await self.db.execute(
            select(Team).where(Team.id == team_id)
        )
        team = team_result.scalar_one_or_none()

        return {
            "team_id": team_id,
            "team_name": team.name if team else "Unknown",
            "competition_id": competition_id,
            "total_clues": len(all_clues),
            "revealed_clues": len(revealed_clues),
            "unrevealed_clues": len(unrevealed_clues),
            "clues": revealed_clues,
            "hidden_clues": unrevealed_clues,
        }

    async def get_clue_progress(
        self, competition_id: int
    ) -> dict[str, Any]:
        all_clues = await self.get_competition_clues(competition_id)

        teams_result = await self.db.execute(
            select(TeamMember.team_id)
            .where(TeamMember.team_id.isnot(None))
            .distinct()
        )
        team_ids = [row[0] for row in teams_result.all()]

        team_progress = []
        for team_id in team_ids:
            team_result = await self.db.execute(
                select(Team).where(Team.id == team_id)
            )
            team = team_result.scalar_one_or_none()

            dist_result = await self.db.execute(
                select(func.count(ClueDistribution.id))
                .where(
                    ClueDistribution.team_id == team_id,
                    ClueDistribution.is_revealed == True,
                )
            )
            revealed_count = dist_result.scalar() or 0

            team_progress.append({
                "team_id": team_id,
                "team_name": team.name if team else "Unknown",
                "total_clues": len(all_clues),
                "revealed_clues": revealed_count,
                "progress_percent": round(
                    (revealed_count / max(1, len(all_clues))) * 100, 1
                ),
            })

        team_progress.sort(key=lambda x: x["revealed_clues"], reverse=True)

        return {
            "competition_id": competition_id,
            "total_clues": len(all_clues),
            "total_teams": len(team_ids),
            "teams": team_progress,
        }

    async def auto_distribute_clues(
        self, competition_id: int
    ) -> dict[str, Any]:
        teams_result = await self.db.execute(
            select(TeamMember.team_id)
            .where(TeamMember.team_id.isnot(None))
            .distinct()
        )
        team_ids = [row[0] for row in teams_result.all()]

        quiz_rounds = await self.db.execute(
            select(QuizRound)
            .where(
                QuizRound.competition_id == competition_id,
                QuizRound.status == QuizRoundStatus.COMPLETED,
                QuizRound.clue_id.isnot(None),
            )
        )
        completed_quiz_rounds = list(quiz_rounds.scalars().all())

        debug_challenges = await self.db.execute(
            select(DebugChallenge)
            .where(
                DebugChallenge.competition_id == competition_id,
                DebugChallenge.status == DebugRoundStatus.COMPLETED,
                DebugChallenge.clue_id.isnot(None),
            )
        )
        completed_debug_challenges = list(debug_challenges.scalars().all())

        distributed = 0
        for team_id in team_ids:
            for round in completed_quiz_rounds:
                try:
                    await self.reveal_clue_to_team(
                        round.clue_id, team_id, round.round_number
                    )
                    distributed += 1
                except ValueError:
                    continue

            for challenge in completed_debug_challenges:
                try:
                    await self.reveal_clue_to_team(
                        challenge.clue_id, team_id, challenge.round_number
                    )
                    distributed += 1
                except ValueError:
                    continue

        return {
            "competition_id": competition_id,
            "teams_processed": len(team_ids),
            "clues_distributed": distributed,
        }

    async def get_clue_stats(
        self, competition_id: int
    ) -> dict[str, Any]:
        clues = await self.get_competition_clues(competition_id)

        phase_stats = {}
        for clue in clues:
            phase = clue.source_phase.value
            if phase not in phase_stats:
                phase_stats[phase] = {"total": 0, "revealed": 0}
            phase_stats[phase]["total"] += 1

            dist_result = await self.db.execute(
                select(func.count(ClueDistribution.id))
                .where(
                    ClueDistribution.clue_id == clue.id,
                    ClueDistribution.is_revealed == True,
                )
            )
            revealed = dist_result.scalar() or 0
            phase_stats[phase]["revealed"] += revealed

        return {
            "competition_id": competition_id,
            "total_clues": len(clues),
            "by_phase": phase_stats,
        }
