from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.base import PaginatedResponse
from app.api.v1.schemas.competition import (
    CompetitionCreate,
    CompetitionPhaseCreate,
    CompetitionPhaseResponse,
    CompetitionResponse,
    CompetitionStatusUpdate,
    CompetitionUpdate,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.competition import CompetitionStatus
from app.domain.entities.user import User, UserRole
from app.services.competition import CompetitionService

router = APIRouter(prefix="/competitions", tags=["Competitions"])


@router.post("/", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(
    data: CompetitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> Competition:
    competition_service = CompetitionService(db)

    try:
        competition = await competition_service.create_competition(
            name=data.name,
            created_by=current_user.id,
            description=data.description,
            theme=data.theme,
            max_teams=data.max_teams,
            team_min_size=data.team_min_size,
            team_max_size=data.team_max_size,
            registration_start=data.registration_start,
            registration_end=data.registration_end,
            event_start=data.event_start,
            event_end=data.event_end,
        )
        return competition
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get("/", response_model=PaginatedResponse[CompetitionResponse])
async def list_competitions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    competition_status: CompetitionStatus | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    competition_service = CompetitionService(db)
    skip = (page - 1) * page_size
    competitions, total = await competition_service.get_competitions(
        skip=skip, limit=page_size, status=competition_status
    )

    return {
        "data": [CompetitionResponse.model_validate(c) for c in competitions],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{competition_id}", response_model=CompetitionResponse)
async def get_competition(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Competition:
    competition_service = CompetitionService(db)
    competition = await competition_service.get_competition_by_id(competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    return competition


@router.put("/{competition_id}", response_model=CompetitionResponse)
async def update_competition(
    competition_id: int,
    data: CompetitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> Competition:
    competition_service = CompetitionService(db)
    competition = await competition_service.get_competition_by_id(competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    return await competition_service.update_competition(competition, **update_data)


@router.patch("/{competition_id}/status", response_model=CompetitionResponse)
async def update_competition_status(
    competition_id: int,
    data: CompetitionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Competition:
    competition_service = CompetitionService(db)
    competition = await competition_service.get_competition_by_id(competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    try:
        return await competition_service.update_status(competition, data.status)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{competition_id}/phases",
    response_model=CompetitionPhaseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_phase(
    competition_id: int,
    data: CompetitionPhaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> CompetitionPhase:
    competition_service = CompetitionService(db)
    competition = await competition_service.get_competition_by_id(competition_id)

    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    return await competition_service.add_phase(
        competition_id=competition_id,
        phase_type=data.phase_type,
        name=data.name,
        order=data.order,
        description=data.description,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
    )
