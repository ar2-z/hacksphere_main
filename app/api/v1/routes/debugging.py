from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.base import PaginatedResponse
from app.api.v1.schemas.debugging import (
    DebugChallengeCreate,
    DebugChallengeForParticipant,
    DebugChallengeResponse,
    DebugChallengeWithTests,
    DebugSubmitCode,
    DebugSubmissionResponse,
    DebugSubmissionWithCode,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.user import User, UserRole
from app.services.debugging import DebuggingService
from app.websockets.manager import manager

router = APIRouter(prefix="/debugging", tags=["Debugging"])


@router.post(
    "/challenges",
    response_model=DebugChallengeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_challenge(
    competition_id: int,
    data: DebugChallengeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)

    try:
        challenge = await debugging_service.create_challenge(
            competition_id=competition_id,
            round_number=data.round_number,
            name=data.name,
            description=data.description,
            difficulty=data.difficulty,
            buggy_code=data.buggy_code,
            instructions=data.instructions,
            time_limit_seconds=data.time_limit_seconds,
            memory_limit_mb=data.memory_limit_mb,
            points=data.points,
            clue_id=data.clue_id,
            test_cases=[tc.model_dump() for tc in data.test_cases],
        )
        return challenge
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get(
    "/challenges", response_model=PaginatedResponse[DebugChallengeResponse]
)
async def list_challenges(
    competition_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    debugging_service = DebuggingService(db)
    challenges = await debugging_service.get_competition_challenges(competition_id)

    start = (page - 1) * page_size
    end = start + page_size
    paginated_challenges = challenges[start:end]

    return {
        "data": [DebugChallengeResponse.model_validate(c) for c in paginated_challenges],
        "total": len(challenges),
        "page": page,
        "page_size": page_size,
        "total_pages": (len(challenges) + page_size - 1) // page_size,
    }


@router.get("/challenges/{challenge_id}", response_model=DebugChallengeResponse)
async def get_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)
    challenge = await debugging_service.get_challenge(challenge_id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    return challenge


@router.get(
    "/challenges/{challenge_id}/details",
    response_model=DebugChallengeForParticipant,
)
async def get_challenge_details(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)
    challenge = await debugging_service.get_challenge(challenge_id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    return challenge


@router.get(
    "/challenges/{challenge_id}/admin",
    response_model=DebugChallengeWithTests,
)
async def get_challenge_admin(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)
    challenge = await debugging_service.get_challenge(challenge_id)

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    return challenge


@router.post("/challenges/{challenge_id}/start", response_model=DebugChallengeResponse)
async def start_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)

    try:
        challenge = await debugging_service.start_challenge(challenge_id)
        
        await manager.broadcast(
            f"competition:{challenge.competition_id}",
            {
                "type": "debug_round_started",
                "data": {
                    "challenge_id": challenge_id,
                    "round_number": challenge.round_number,
                    "started_at": challenge.started_at.isoformat() if challenge.started_at else None,
                },
            },
        )
        
        return challenge
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/challenges/{challenge_id}/pause", response_model=DebugChallengeResponse)
async def pause_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)

    try:
        challenge = await debugging_service.pause_challenge(challenge_id)
        
        await manager.broadcast(
            f"competition:{challenge.competition_id}",
            {
                "type": "debug_round_paused",
                "data": {"challenge_id": challenge_id},
            },
        )
        
        return challenge
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/challenges/{challenge_id}/resume", response_model=DebugChallengeResponse
)
async def resume_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)

    try:
        challenge = await debugging_service.resume_challenge(challenge_id)
        
        await manager.broadcast(
            f"competition:{challenge.competition_id}",
            {
                "type": "debug_round_resumed",
                "data": {"challenge_id": challenge_id},
            },
        )
        
        return challenge
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/challenges/{challenge_id}/end", response_model=DebugChallengeResponse)
async def end_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> DebugChallenge:
    debugging_service = DebuggingService(db)

    try:
        challenge = await debugging_service.end_challenge(challenge_id)
        
        await manager.broadcast(
            f"competition:{challenge.competition_id}",
            {
                "type": "debug_round_ended",
                "data": {
                    "challenge_id": challenge_id,
                    "ended_at": challenge.ended_at.isoformat() if challenge.ended_at else None,
                },
            },
        )
        
        return challenge
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/submit", response_model=DebugSubmissionResponse)
async def submit_code(
    data: DebugSubmitCode,
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebugSubmission:
    debugging_service = DebuggingService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to submit code",
        )

    try:
        submission = await debugging_service.submit_code(
            challenge_id=challenge_id,
            team_id=team_id,
            submitted_code=data.submitted_code,
        )
        
        challenge = await debugging_service.get_challenge(challenge_id)
        if challenge:
            await manager.broadcast(
                f"competition:{challenge.competition_id}",
                {
                    "type": "code_submitted",
                    "data": {
                        "team_id": team_id,
                        "challenge_id": challenge_id,
                        "status": submission.status.value,
                        "score": submission.score,
                    },
                },
            )
        
        return submission
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/challenges/{challenge_id}/results",
    response_model=DebugSubmissionResponse,
)
async def get_challenge_results(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebugSubmission | None:
    debugging_service = DebuggingService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to view results",
        )

    submission = await debugging_service.get_challenge_results(challenge_id, team_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No submission found",
        )

    return submission


@router.get("/challenges/{challenge_id}/leaderboard")
async def get_challenge_leaderboard(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    debugging_service = DebuggingService(db)
    return await debugging_service.get_challenge_leaderboard(challenge_id)


@router.get("/progress")
async def get_debugging_progress(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    debugging_service = DebuggingService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to view progress",
        )

    return await debugging_service.get_team_progress(competition_id, team_id)


async def _get_user_team_id(db: AsyncSession, user_id: int) -> int | None:
    from sqlalchemy import select
    from app.domain.entities.team import TeamMember

    result = await db.execute(
        select(TeamMember.team_id).where(TeamMember.user_id == user_id)
    )
    row = result.first()
    return row[0] if row else None
