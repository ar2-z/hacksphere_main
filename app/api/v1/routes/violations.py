from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.admin import (
    ViolationActionUpdate,
    ViolationResolve,
    ViolationResponse,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.user import User, UserRole
from app.domain.entities.violation import ViolationAction, ViolationType
from app.services.violation import ViolationService
from app.websockets.manager import manager

router = APIRouter(prefix="/violations", tags=["Violations"])


@router.post("/report", response_model=ViolationResponse)
async def report_violation(
    violation_type: ViolationType,
    description: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Violation:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition to report violations",
        )

    try:
        violation = await violation_service.report_violation(
            user_id=current_user.id,
            competition_id=competition_id,
            violation_type=violation_type,
            description=description,
        )

        await manager.send_personal_message(
            {
                "type": "violation_reported",
                "data": {
                    "violation_id": violation.id,
                    "violation_type": violation.violation_type.value,
                    "action_taken": violation.action_taken.value,
                },
            },
            current_user.id,
        )

        await manager.broadcast(
            f"competition:{competition_id}",
            {
                "type": "admin_alert",
                "data": {
                    "user_id": current_user.id,
                    "violation_type": violation.violation_type.value,
                    "severity": violation.severity.value,
                    "action_taken": violation.action_taken.value,
                },
            },
        )

        return violation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/report/tab-switch", response_model=ViolationResponse)
async def report_tab_switch(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Violation:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    return await violation_service.report_tab_switch(current_user.id, competition_id)


@router.post("/report/window-blur", response_model=ViolationResponse)
async def report_window_blur(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Violation:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    return await violation_service.report_window_blur(current_user.id, competition_id)


@router.post("/report/fullscreen-exit", response_model=ViolationResponse)
async def report_fullscreen_exit(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Violation:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    return await violation_service.report_fullscreen_exit(current_user.id, competition_id)


@router.post("/report/clipboard-copy", response_model=ViolationResponse)
async def report_clipboard_copy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Violation:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    return await violation_service.report_clipboard_copy(current_user.id, competition_id)


@router.post("/report/clipboard-paste", response_model=ViolationResponse)
async def report_clipboard_paste(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Violation:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    return await violation_service.report_clipboard_paste(current_user.id, competition_id)


@router.post("/report/refresh", response_model=ViolationResponse)
async def report_browser_refresh(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Violation:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    return await violation_service.report_browser_refresh(current_user.id, competition_id)


@router.get("/my-violations")
async def get_my_violations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    violations = await violation_service.get_user_violations(
        current_user.id, competition_id
    )

    return [
        {
            "id": v.id,
            "violation_type": v.violation_type.value,
            "severity": v.severity.value,
            "action_taken": v.action_taken.value,
            "description": v.description,
            "created_at": v.created_at.isoformat(),
        }
        for v in violations
    ]


@router.get("/my-count")
async def get_my_violation_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    violation_service = ViolationService(db)

    competition_id = await _get_user_competition_id(db, current_user.id)
    if not competition_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a competition",
        )

    return await violation_service.get_user_violation_count(
        current_user.id, competition_id
    )


@router.get("/team/{team_id}", response_model=list[dict])
async def get_team_violations(
    team_id: int,
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> list[dict]:
    violation_service = ViolationService(db)
    return await violation_service.get_team_violations(team_id, competition_id)


@router.get("/competition/{competition_id}")
async def get_competition_violations(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    violation_service = ViolationService(db)
    return await violation_service.get_competition_violations(competition_id)


@router.get("/stats/{competition_id}")
async def get_violation_stats(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    violation_service = ViolationService(db)
    return await violation_service.get_violation_stats(competition_id)


@router.post("/{violation_id}/action", response_model=ViolationResponse)
async def take_action(
    violation_id: int,
    data: ViolationActionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Violation:
    violation_service = ViolationService(db)

    try:
        return await violation_service.take_action(
            violation_id=violation_id,
            action=data.action_taken,
            admin_id=current_user.id,
            reason=data.reason,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post("/{violation_id}/resolve", response_model=ViolationResponse)
async def resolve_violation(
    violation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Violation:
    violation_service = ViolationService(db)

    try:
        return await violation_service.resolve_violation(violation_id, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


async def _get_user_competition_id(db: AsyncSession, user_id: int) -> int | None:
    from sqlalchemy import select
    from app.domain.entities.team import Team, TeamMember

    result = await db.execute(
        select(Team.competition_id)
        .join(TeamMember)
        .where(TeamMember.user_id == user_id)
    )
    row = result.first()
    return row[0] if row else None
