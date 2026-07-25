from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.admin import (
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementUpdate,
    AuditLogResponse,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.announcement import AnnouncementPriority
from app.domain.entities.score import ScorePhase
from app.domain.entities.user import User, UserRole
from app.services.admin import AdminService
from app.websockets.manager import manager

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard/{competition_id}")
async def get_dashboard(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    admin_service = AdminService(db)
    return await admin_service.get_dashboard_stats(competition_id)


@router.get("/participants/{competition_id}")
async def get_participants(
    competition_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    admin_service = AdminService(db)
    return await admin_service.get_participants_list(competition_id, page, page_size)


@router.get("/teams/{competition_id}")
async def get_teams_overview(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> list[dict]:
    admin_service = AdminService(db)
    return await admin_service.get_teams_overview(competition_id)


@router.post("/announcements", response_model=AnnouncementResponse)
async def create_announcement(
    data: AnnouncementCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> AnnouncementResponse:
    admin_service = AdminService(db)

    announcement = await admin_service.create_announcement(
        competition_id=data.competition_id,
        title=data.title,
        content=data.content,
        priority=data.priority,
        is_pinned=data.is_pinned,
        is_broadcast=data.is_broadcast,
        target_team_id=data.target_team_id,
        created_by=current_user.id,
    )

    await manager.broadcast(
        f"competition:{data.competition_id}",
        {
            "type": "announcement",
            "data": {
                "id": announcement.id,
                "title": announcement.title,
                "content": announcement.content,
                "priority": announcement.priority.value,
            },
        },
    )

    await admin_service.log_audit(
        user_id=current_user.id,
        action="create_announcement",
        resource_type="announcement",
        resource_id=announcement.id,
        details={"title": announcement.title},
        ip_address=request.client.host if request.client else None,
    )

    return announcement


@router.get("/announcements/{competition_id}")
async def get_announcements(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> list[AnnouncementResponse]:
    admin_service = AdminService(db)
    return await admin_service.get_announcements(competition_id)


@router.put("/announcements/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> AnnouncementResponse:
    admin_service = AdminService(db)

    try:
        update_data = data.model_dump(exclude_unset=True)
        announcement = await admin_service.update_announcement(announcement_id, **update_data)

        await admin_service.log_audit(
            user_id=current_user.id,
            action="update_announcement",
            resource_type="announcement",
            resource_id=announcement_id,
            details=update_data,
            ip_address=request.client.host if request.client else None,
        )

        return announcement
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> dict[str, str]:
    admin_service = AdminService(db)

    success = await admin_service.delete_announcement(announcement_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found",
        )

    await admin_service.log_audit(
        user_id=current_user.id,
        action="delete_announcement",
        resource_type="announcement",
        resource_id=announcement_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Announcement deleted successfully"}


@router.get("/audit-logs")
async def get_audit_logs(
    competition_id: int | None = None,
    user_id: int | None = None,
    action: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> dict:
    admin_service = AdminService(db)
    return await admin_service.get_audit_logs(competition_id, user_id, action, page, page_size)


@router.get("/analytics/{competition_id}")
async def get_analytics(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    admin_service = AdminService(db)
    return await admin_service.get_analytics(competition_id)


@router.post("/override-score")
async def override_score(
    team_id: int,
    phase: ScorePhase,
    points: float,
    reason: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> dict:
    admin_service = AdminService(db)

    score = await admin_service.override_team_score(
        team_id=team_id,
        phase=phase,
        points=points,
        reason=reason,
        awarded_by=current_user.id,
    )

    await admin_service.log_audit(
        user_id=current_user.id,
        action="override_score",
        resource_type="score",
        resource_id=score.id,
        details={
            "team_id": team_id,
            "phase": phase.value,
            "points": points,
            "reason": reason,
        },
        ip_address=request.client.host if request.client else None,
    )

    return {
        "score_id": score.id,
        "team_id": team_id,
        "points": points,
    }


@router.post("/bulk-action")
async def bulk_action_teams(
    competition_id: int,
    team_ids: list[int],
    action: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> dict:
    admin_service = AdminService(db)

    results = await admin_service.bulk_action_teams(competition_id, team_ids, action)

    await admin_service.log_audit(
        user_id=current_user.id,
        action=f"bulk_{action}",
        resource_type="team",
        details={
            "team_ids": team_ids,
            "action": action,
            "results": results,
        },
        ip_address=request.client.host if request.client else None,
    )

    return results


@router.post("/broadcast")
async def broadcast_message(
    competition_id: int,
    message: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    await manager.broadcast(
        f"competition:{competition_id}",
        {
            "type": "admin_broadcast",
            "data": {
                "message": message,
                "from": current_user.full_name,
            },
        },
    )

    return {"message": "Broadcast sent successfully"}


@router.get("/live-status/{competition_id}")
async def get_live_status(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> dict:
    from app.domain.entities.quiz import QuizRound, QuizRoundStatus
    from app.domain.entities.debugging import DebugChallenge, DebugRoundStatus
    from app.domain.entities.ideathon import Presentation, PresentationStatus

    quiz_result = await db.execute(
        select(QuizRound).where(QuizRound.competition_id == competition_id)
    )
    quiz_rounds = list(quiz_result.scalars().all())

    debug_result = await db.execute(
        select(DebugChallenge).where(DebugChallenge.competition_id == competition_id)
    )
    debug_challenges = list(debug_result.scalars().all())

    presentation_result = await db.execute(
        select(Presentation).where(Presentation.competition_id == competition_id)
    )
    presentations = list(presentation_result.scalars().all())

    active_quiz = [r for r in quiz_rounds if r.status == QuizRoundStatus.ACTIVE]
    active_debug = [c for c in debug_challenges if c.status == DebugRoundStatus.ACTIVE]
    active_presentations = [p for p in presentations if p.status == PresentationStatus.IN_PROGRESS]

    return {
        "competition_id": competition_id,
        "quiz": {
            "total_rounds": len(quiz_rounds),
            "completed_rounds": len([r for r in quiz_rounds if r.status == QuizRoundStatus.COMPLETED]),
            "active_rounds": len(active_quiz),
            "current_round": active_quiz[0].round_number if active_quiz else None,
        },
        "debugging": {
            "total_challenges": len(debug_challenges),
            "completed_challenges": len([c for c in debug_challenges if c.status == DebugRoundStatus.COMPLETED]),
            "active_challenges": len(active_debug),
            "current_challenge": active_debug[0].round_number if active_debug else None,
        },
        "ideathon": {
            "total_presentations": len(presentations),
            "completed_presentations": len([p for p in presentations if p.status == PresentationStatus.COMPLETED]),
            "active_presentation": active_presentations[0].presentation_order if active_presentations else None,
            "presentations_in_queue": len([p for p in presentations if p.status in [PresentationStatus.READY, PresentationStatus.IN_PROGRESS]]),
        },
    }
