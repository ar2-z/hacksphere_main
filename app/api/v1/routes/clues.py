from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.base import PaginatedResponse
from app.api.v1.schemas.clue import (
    ClueCreate,
    ClueDistributionResponse,
    ClueRevealRequest,
    ClueResponse,
    ClueUpdate,
    TeamCluesResponse,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.user import User, UserRole
from app.services.clue import ClueService
from app.websockets.manager import manager

router = APIRouter(prefix="/clues", tags=["Clues"])


@router.post(
    "/",
    response_model=ClueResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_clue(
    competition_id: int,
    data: ClueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Clue:
    clue_service = ClueService(db)

    try:
        return await clue_service.create_clue(
            competition_id=competition_id,
            name=data.name,
            clue_type=data.clue_type,
            content=data.content,
            order=data.order,
            source_phase=data.source_phase,
            description=data.description,
            source_round=data.source_round,
            is_active=data.is_active,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/", response_model=PaginatedResponse[ClueResponse])
async def list_clues(
    competition_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    clue_service = ClueService(db)
    clues = await clue_service.get_competition_clues(competition_id)

    start = (page - 1) * page_size
    end = start + page_size
    paginated_clues = clues[start:end]

    return {
        "data": [ClueResponse.model_validate(c) for c in paginated_clues],
        "total": len(clues),
        "page": page,
        "page_size": page_size,
        "total_pages": (len(clues) + page_size - 1) // page_size,
    }


@router.get("/{clue_id}", response_model=ClueResponse)
async def get_clue(
    clue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Clue:
    clue_service = ClueService(db)
    clue = await clue_service.get_clue(clue_id)

    if not clue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clue not found",
        )

    return clue


@router.put("/{clue_id}", response_model=ClueResponse)
async def update_clue(
    clue_id: int,
    data: ClueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Clue:
    clue_service = ClueService(db)

    try:
        update_data = data.model_dump(exclude_unset=True)
        return await clue_service.update_clue(clue_id, **update_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{clue_id}")
async def delete_clue(
    clue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> dict[str, str]:
    clue_service = ClueService(db)

    success = await clue_service.delete_clue(clue_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clue not found",
        )

    return {"message": "Clue deleted successfully"}


@router.post("/reveal", response_model=ClueDistributionResponse)
async def reveal_clue(
    data: ClueRevealRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> ClueDistribution:
    clue_service = ClueService(db)

    try:
        distribution = await clue_service.reveal_clue_to_team(
            clue_id=data.clue_id,
            team_id=data.team_id,
            earned_by_round=data.earned_by_round,
        )

        clue = await clue_service.get_clue(data.clue_id)
        if clue:
            await manager.broadcast(
                f"competition:{clue.competition_id}",
                {
                    "type": "clue_revealed",
                    "data": {
                        "team_id": data.team_id,
                        "clue_id": data.clue_id,
                        "clue_name": clue.name,
                    },
                },
            )

        return distribution
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/team/{team_id}", response_model=TeamCluesResponse)
async def get_team_clues(
    team_id: int,
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    clue_service = ClueService(db)

    if current_user.id != team_id and not current_user.is_admin:
        from app.domain.entities.team import TeamMember
        from sqlalchemy import select
        
        result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user.id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this team's clues",
            )

    return await clue_service.get_team_clues(team_id, competition_id)


@router.get("/my-clues")
async def get_my_clues(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    clue_service = ClueService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to view clues",
        )

    return await clue_service.get_team_clues(team_id, competition_id)


@router.get("/progress/{competition_id}")
async def get_clue_progress(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    clue_service = ClueService(db)
    return await clue_service.get_clue_progress(competition_id)


@router.post("/auto-distribute/{competition_id}")
async def auto_distribute_clues(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    clue_service = ClueService(db)

    result = await clue_service.auto_distribute_clues(competition_id)

    await manager.broadcast(
        f"competition:{competition_id}",
        {
            "type": "clues_distributed",
            "data": result,
        },
    )

    return result


@router.get("/stats/{competition_id}")
async def get_clue_stats(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    clue_service = ClueService(db)
    return await clue_service.get_clue_stats(competition_id)


async def _get_user_team_id(db: AsyncSession, user_id: int) -> int | None:
    from sqlalchemy import select
    from app.domain.entities.team import TeamMember

    result = await db.execute(
        select(TeamMember.team_id).where(TeamMember.user_id == user_id)
    )
    row = result.first()
    return row[0] if row else None
