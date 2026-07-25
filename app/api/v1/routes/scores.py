from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.score import (
    LeaderboardEntry,
    LeaderboardResponse,
    ScoreCreate,
    ScoreHistoryResponse,
    ScoreOverride,
    ScoreResponse,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.user import User, UserRole
from app.services.score import ScoreService
from app.websockets.manager import manager

router = APIRouter(prefix="/scores", tags=["Scores"])


@router.post("/", response_model=ScoreResponse, status_code=status.HTTP_201_CREATED)
async def add_score(
    data: ScoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Score:
    score_service = ScoreService(db)

    try:
        score = await score_service.add_score(
            team_id=data.team_id,
            phase=data.phase,
            points=data.points,
            description=data.description,
            reference_id=data.reference_id,
            reference_type=data.reference_type,
            awarded_by=current_user.id,
        )

        await _broadcast_score_update(db, data.team_id, current_user.id)

        return score
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/bonus", response_model=ScoreResponse)
async def add_bonus_score(
    team_id: int,
    points: float,
    description: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Score:
    score_service = ScoreService(db)

    try:
        score = await score_service.add_bonus_score(
            team_id=team_id,
            points=points,
            description=description,
            awarded_by=current_user.id,
        )

        await _broadcast_score_update(db, team_id, current_user.id)

        return score
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/penalty", response_model=ScoreResponse)
async def add_penalty_score(
    team_id: int,
    points: float,
    description: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Score:
    score_service = ScoreService(db)

    try:
        score = await score_service.add_penalty_score(
            team_id=team_id,
            points=points,
            description=description,
            awarded_by=current_user.id,
        )

        await _broadcast_score_update(db, team_id, current_user.id)

        return score
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/override", response_model=ScoreResponse)
async def override_score(
    data: ScoreOverride,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> Score:
    score_service = ScoreService(db)

    try:
        score = await score_service.override_score(
            team_id=data.team_id,
            phase=data.phase,
            points=data.points,
            reason=data.reason,
            awarded_by=current_user.id,
        )

        await _broadcast_score_update(db, data.team_id, current_user.id)

        return score
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/team/{team_id}")
async def get_team_scores(
    team_id: int,
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    score_service = ScoreService(db)
    breakdown = await score_service.get_team_score_breakdown(team_id, competition_id)
    return breakdown


@router.get("/team/{team_id}/history")
async def get_team_score_history(
    team_id: int,
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    score_service = ScoreService(db)
    return await score_service.get_score_history(team_id, competition_id)


@router.get("/leaderboard/{competition_id}")
async def get_leaderboard(
    competition_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    score_service = ScoreService(db)
    return await score_service.get_leaderboard(competition_id, limit)


@router.get("/my-scores")
async def get_my_scores(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    score_service = ScoreService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to view scores",
        )

    return await score_service.get_team_score_breakdown(team_id, competition_id)


@router.get("/stats/{competition_id}")
async def get_competition_stats(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    score_service = ScoreService(db)
    return await score_service.get_competition_stats(competition_id)


@router.get("/phase-stats/{competition_id}")
async def get_phase_stats(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    score_service = ScoreService(db)
    return await score_service.get_phase_stats(competition_id)


@router.post("/snapshot/{competition_id}")
async def record_snapshot(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    score_service = ScoreService(db)

    count = await score_service.record_score_snapshot(competition_id)

    leaderboard = await score_service.get_leaderboard(competition_id)
    await manager.broadcast(
        f"competition:{competition_id}",
        {
            "type": "leaderboard_update",
            "data": leaderboard,
        },
    )

    return {
        "competition_id": competition_id,
        "snapshots_recorded": count,
    }


async def _get_user_team_id(db: AsyncSession, user_id: int) -> int | None:
    from sqlalchemy import select
    from app.domain.entities.team import TeamMember

    result = await db.execute(
        select(TeamMember.team_id).where(TeamMember.user_id == user_id)
    )
    row = result.first()
    return row[0] if row else None


async def _broadcast_score_update(
    db: AsyncSession, team_id: int, user_id: int
) -> None:
    from app.domain.entities.team import Team

    team_result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = team_result.scalar_one_or_none()

    if team:
        score_service = ScoreService(db)
        breakdown = await score_service.get_team_score_breakdown(
            team_id, team.competition_id
        )

        await manager.broadcast(
            f"competition:{team.competition_id}",
            {
                "type": "score_update",
                "data": {
                    "team_id": team_id,
                    "team_name": team.name,
                    "total_score": breakdown["total_score"],
                },
            },
        )
