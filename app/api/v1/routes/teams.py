from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.base import PaginatedResponse
from app.api.v1.schemas.team import (
    TeamCreate,
    TeamJoin,
    TeamReady,
    TeamResponse,
    TeamUpdate,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user
from app.domain.entities.user import User
from app.services.team import TeamService

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    data: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team_service = TeamService(db)

    try:
        team = await team_service.create_team(
            name=data.name,
            competition_id=data.competition_id,
            creator=current_user,
            description=data.description,
        )
        return team
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.post("/join", response_model=TeamResponse)
async def join_team(
    data: TeamJoin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team_service = TeamService(db)

    try:
        team = await team_service.join_team(
            team_code=data.team_code,
            user=current_user,
        )
        return team
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{team_id}/leave")
async def leave_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    team_service = TeamService(db)

    try:
        await team_service.leave_team(team_id, current_user)
        return {"message": "Left team successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team_service = TeamService(db)
    team = await team_service.get_team_by_id(team_id)

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    data: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team_service = TeamService(db)
    team = await team_service.get_team_by_id(team_id)

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    is_leader = any(
        m.user_id == current_user.id and m.role.value == "leader"
        for m in team.members
    )

    if not is_leader and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leader can update team",
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(team, key, value)

    await db.flush()
    await db.refresh(team)
    return team


@router.post("/{team_id}/ready", response_model=TeamResponse)
async def set_team_ready(
    team_id: int,
    data: TeamReady,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Team:
    team_service = TeamService(db)

    try:
        team = await team_service.set_team_ready(team_id, data.is_ready)
        return team
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/competition/{competition_id}", response_model=PaginatedResponse[TeamResponse])
async def list_competition_teams(
    competition_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    team_service = TeamService(db)
    skip = (page - 1) * page_size
    teams, total = await team_service.get_competition_teams(
        competition_id, skip=skip, limit=page_size
    )

    return {
        "data": [TeamResponse.model_validate(t) for t in teams],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }
