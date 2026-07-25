from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.competition import Competition, CompetitionPhase, CompetitionStatus


class CompetitionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_competition(
        self,
        name: str,
        created_by: int,
        description: str | None = None,
        theme: str | None = None,
        **kwargs: dict,
    ) -> Competition:
        existing = await self.db.execute(
            select(Competition).where(Competition.name == name)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Competition name already exists")

        competition = Competition(
            name=name,
            description=description,
            theme=theme,
            created_by=created_by,
            **kwargs,
        )
        self.db.add(competition)
        await self.db.flush()
        await self.db.refresh(competition)
        return competition

    async def get_competition_by_id(self, competition_id: int) -> Competition | None:
        result = await self.db.execute(
            select(Competition).where(Competition.id == competition_id)
        )
        return result.scalar_one_or_none()

    async def get_competitions(
        self,
        skip: int = 0,
        limit: int = 20,
        status: CompetitionStatus | None = None,
    ) -> tuple[list[Competition], int]:
        query = select(Competition)

        if status:
            query = query.where(Competition.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(Competition.created_at.desc())
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        competitions = list(result.scalars().all())

        return competitions, total

    async def update_competition(
        self, competition: Competition, **kwargs: dict
    ) -> Competition:
        for key, value in kwargs.items():
            if hasattr(competition, key) and value is not None:
                setattr(competition, key, value)
        await self.db.flush()
        await self.db.refresh(competition)
        return competition

    async def update_status(
        self, competition: Competition, new_status: CompetitionStatus
    ) -> Competition:
        valid_transitions = {
            CompetitionStatus.DRAFT: [
                CompetitionStatus.REGISTRATION_OPEN,
            ],
            CompetitionStatus.REGISTRATION_OPEN: [
                CompetitionStatus.REGISTRATION_CLOSED,
                CompetitionStatus.DRAFT,
            ],
            CompetitionStatus.REGISTRATION_CLOSED: [
                CompetitionStatus.IN_PROGRESS,
            ],
            CompetitionStatus.IN_PROGRESS: [
                CompetitionStatus.COMPLETED,
            ],
            CompetitionStatus.COMPLETED: [
                CompetitionStatus.ARCHIVED,
            ],
        }

        allowed = valid_transitions.get(competition.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from {competition.status} to {new_status}"
            )

        competition.status = new_status
        await self.db.flush()
        await self.db.refresh(competition)
        return competition

    async def add_phase(
        self,
        competition_id: int,
        phase_type: str,
        name: str,
        order: int,
        description: str | None = None,
        starts_at: Any = None,
        ends_at: Any = None,
    ) -> CompetitionPhase:
        phase = CompetitionPhase(
            competition_id=competition_id,
            phase_type=phase_type,
            name=name,
            order=order,
            description=description,
            starts_at=starts_at,
            ends_at=ends_at,
        )
        self.db.add(phase)
        await self.db.flush()
        await self.db.refresh(phase)
        return phase

    async def get_phase_by_id(self, phase_id: int) -> CompetitionPhase | None:
        result = await self.db.execute(
            select(CompetitionPhase).where(CompetitionPhase.id == phase_id)
        )
        return result.scalar_one_or_none()
