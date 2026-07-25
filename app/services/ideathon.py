from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.entities.ideathon import Presentation, PresentationScore, PresentationStatus
from app.domain.entities.score import Score, ScorePhase
from app.domain.entities.team import Team
from app.infrastructure.storage.local import storage


class IdeathonService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_presentation(
        self,
        competition_id: int,
        team_id: int,
        problem_statement: str,
        idea_summary: str,
        theme: str | None = None,
        problem_category: str | None = None,
    ) -> Presentation:
        existing = await self.db.execute(
            select(Presentation).where(
                Presentation.competition_id == competition_id,
                Presentation.team_id == team_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Presentation already exists for this team")

        presentation = Presentation(
            competition_id=competition_id,
            team_id=team_id,
            problem_statement=problem_statement,
            idea_summary=idea_summary,
            theme=theme,
            problem_category=problem_category,
            status=PresentationStatus.DRAFT,
        )
        self.db.add(presentation)
        await self.db.flush()
        await self.db.refresh(presentation)
        return presentation

    async def update_presentation(
        self,
        presentation_id: int,
        team_id: int,
        **kwargs: dict,
    ) -> Presentation:
        result = await self.db.execute(
            select(Presentation).where(
                Presentation.id == presentation_id,
                Presentation.team_id == team_id,
            )
        )
        presentation = result.scalar_one_or_none()

        if not presentation:
            raise ValueError("Presentation not found")

        if presentation.status == PresentationStatus.READY:
            raise ValueError("Cannot update after pressing Ready")

        for key, value in kwargs.items():
            if hasattr(presentation, key) and value is not None:
                setattr(presentation, key, value)

        await self.db.flush()
        await self.db.refresh(presentation)
        return presentation

    async def upload_presentation_file(
        self,
        presentation_id: int,
        team_id: int,
        file: Any,
        filename: str,
    ) -> Presentation:
        result = await self.db.execute(
            select(Presentation).where(
                Presentation.id == presentation_id,
                Presentation.team_id == team_id,
            )
        )
        presentation = result.scalar_one_or_none()

        if not presentation:
            raise ValueError("Presentation not found")

        if presentation.status == PresentationStatus.READY:
            raise ValueError("Cannot update after pressing Ready")

        upload_result = await storage.upload_file(
            file=file.file,
            filename=filename,
            category=f"presentations/{presentation.competition_id}",
        )

        presentation.presentation_file_url = upload_result["url"]
        presentation.presentation_file_name = upload_result["original_filename"]

        await self.db.flush()
        await self.db.refresh(presentation)
        return presentation

    async def set_ready(
        self,
        presentation_id: int,
        team_id: int,
    ) -> Presentation:
        result = await self.db.execute(
            select(Presentation).where(
                Presentation.id == presentation_id,
                Presentation.team_id == team_id,
            )
        )
        presentation = result.scalar_one_or_none()

        if not presentation:
            raise ValueError("Presentation not found")

        if presentation.status == PresentationStatus.READY:
            raise ValueError("Already marked as ready")

        presentation.status = PresentationStatus.READY
        presentation.ready_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(presentation)
        return presentation

    async def generate_presentation_order(
        self,
        competition_id: int,
    ) -> list[Presentation]:
        result = await self.db.execute(
            select(Presentation)
            .where(
                Presentation.competition_id == competition_id,
                Presentation.status == PresentationStatus.READY,
            )
            .options(selectinload(Presentation.team))
        )
        presentations = list(result.scalars().all())

        if not presentations:
            raise ValueError("No ready presentations found")

        random.shuffle(presentations)

        for idx, presentation in enumerate(presentations, 1):
            presentation.presentation_order = idx
            presentation.status = PresentationStatus.IN_PROGRESS

        await self.db.flush()

        for presentation in presentations:
            await self.db.refresh(presentation)

        return presentations

    async def start_presentation(
        self,
        presentation_id: int,
    ) -> Presentation:
        result = await self.db.execute(
            select(Presentation).where(Presentation.id == presentation_id)
        )
        presentation = result.scalar_one_or_none()

        if not presentation:
            raise ValueError("Presentation not found")

        if presentation.status != PresentationStatus.IN_PROGRESS:
            raise ValueError("Presentation is not in queue")

        presentation.presented_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(presentation)
        return presentation

    async def complete_presentation(
        self,
        presentation_id: int,
    ) -> Presentation:
        result = await self.db.execute(
            select(Presentation).where(Presentation.id == presentation_id)
        )
        presentation = result.scalar_one_or_none()

        if not presentation:
            raise ValueError("Presentation not found")

        presentation.status = PresentationStatus.COMPLETED
        await self.db.flush()
        await self.db.refresh(presentation)
        return presentation

    async def score_presentation(
        self,
        presentation_id: int,
        admin_id: int,
        category: str,
        score: float,
        max_score: float = 10.0,
        feedback: str | None = None,
        criteria: dict | None = None,
    ) -> PresentationScore:
        result = await self.db.execute(
            select(Presentation).where(Presentation.id == presentation_id)
        )
        presentation = result.scalar_one_or_none()

        if not presentation:
            raise ValueError("Presentation not found")

        if presentation.status != PresentationStatus.COMPLETED:
            raise ValueError("Can only score completed presentations")

        existing = await self.db.execute(
            select(PresentationScore).where(
                PresentationScore.presentation_id == presentation_id,
                PresentationScore.admin_id == admin_id,
                PresentationScore.category == category,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already scored this category")

        if score > max_score:
            raise ValueError("Score cannot exceed max score")

        score_obj = PresentationScore(
            presentation_id=presentation_id,
            admin_id=admin_id,
            category=category,
            score=score,
            max_score=max_score,
            feedback=feedback,
            criteria=criteria,
        )
        self.db.add(score_obj)

        team_score = Score(
            team_id=presentation.team_id,
            phase=ScorePhase.IDEATHON,
            points=score,
            description=f"Ideathon - {category}",
            reference_id=presentation_id,
            reference_type="presentation_score",
            awarded_by=admin_id,
        )
        self.db.add(team_score)

        await self.db.flush()
        await self.db.refresh(score_obj)
        return score_obj

    async def get_presentation(
        self, presentation_id: int
    ) -> Presentation | None:
        result = await self.db.execute(
            select(Presentation)
            .options(selectinload(Presentation.scores))
            .where(Presentation.id == presentation_id)
        )
        return result.scalar_one_or_none()

    async def get_team_presentation(
        self, competition_id: int, team_id: int
    ) -> Presentation | None:
        result = await self.db.execute(
            select(Presentation)
            .options(selectinload(Presentation.scores))
            .where(
                Presentation.competition_id == competition_id,
                Presentation.team_id == team_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_competition_presentations(
        self, competition_id: int
    ) -> list[Presentation]:
        result = await self.db.execute(
            select(Presentation)
            .where(Presentation.competition_id == competition_id)
            .options(selectinload(Presentation.scores))
            .order_by(Presentation.presentation_order)
        )
        return list(result.scalars().all())

    async def get_presentation_queue(
        self, competition_id: int
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Presentation)
            .join(Team)
            .where(
                Presentation.competition_id == competition_id,
                Presentation.status.in_([
                    PresentationStatus.READY,
                    PresentationStatus.IN_PROGRESS,
                    PresentationStatus.COMPLETED,
                ]),
            )
            .options(selectinload(Presentation.team))
            .order_by(Presentation.presentation_order)
        )
        presentations = list(result.scalars().all())

        queue = []
        for p in presentations:
            queue.append({
                "presentation_id": p.id,
                "team_id": p.team_id,
                "team_name": p.team.name if p.team else "Unknown",
                "presentation_order": p.presentation_order,
                "status": p.status.value,
                "problem_category": p.problem_category,
                "presented_at": p.presented_at.isoformat() if p.presented_at else None,
                "total_score": p.total_score,
            })

        return queue

    async def get_presentation_results(
        self, competition_id: int
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Presentation)
            .where(
                Presentation.competition_id == competition_id,
                Presentation.status == PresentationStatus.COMPLETED,
            )
            .options(selectinload(Presentation.scores))
            .order_by(Presentation.presentation_order)
        )
        presentations = list(result.scalars().all())

        results = []
        for p in presentations:
            score_categories = {}
            for s in p.scores:
                score_categories[s.category] = {
                    "score": s.score,
                    "max_score": s.max_score,
                    "feedback": s.feedback,
                }

            results.append({
                "presentation_id": p.id,
                "team_id": p.team_id,
                "presentation_order": p.presentation_order,
                "problem_statement": p.problem_statement,
                "idea_summary": p.idea_summary,
                "problem_category": p.problem_category,
                "total_score": p.total_score,
                "scores": score_categories,
            })

        results.sort(key=lambda x: x["total_score"], reverse=True)
        return results
