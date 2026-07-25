from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.base import PaginatedResponse
from app.api.v1.schemas.ideathon import (
    PresentationCreate,
    PresentationOrderResponse,
    PresentationReady,
    PresentationResponse,
    PresentationScoreCreate,
    PresentationScoreResponse,
    PresentationUpdate,
    PresentationWithScores,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.user import User, UserRole
from app.services.ideathon import IdeathonService
from app.websockets.manager import manager

router = APIRouter(prefix="/ideathon", tags=["Ideathon"])


@router.post(
    "/presentations",
    response_model=PresentationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_presentation(
    data: PresentationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Presentation:
    ideathon_service = IdeathonService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to create a presentation",
        )

    try:
        return await ideathon_service.create_presentation(
            competition_id=data.competition_id,
            team_id=team_id,
            problem_statement=data.problem_statement,
            idea_summary=data.idea_summary,
            theme=data.theme,
            problem_category=data.problem_category,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get("/presentations/my", response_model=PresentationWithScores)
async def get_my_presentation(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Presentation | None:
    ideathon_service = IdeathonService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team",
        )

    presentation = await ideathon_service.get_team_presentation(
        competition_id, team_id
    )

    if not presentation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No presentation found",
        )

    return presentation


@router.put("/presentations/{presentation_id}", response_model=PresentationResponse)
async def update_presentation(
    presentation_id: int,
    data: PresentationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Presentation:
    ideathon_service = IdeathonService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team",
        )

    try:
        update_data = data.model_dump(exclude_unset=True)
        return await ideathon_service.update_presentation(
            presentation_id, team_id, **update_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/presentations/{presentation_id}/upload",
    response_model=PresentationResponse,
)
async def upload_presentation_file(
    presentation_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Presentation:
    ideathon_service = IdeathonService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team",
        )

    allowed_types = [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.google-slides+xml",
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Use PDF, PPT, or PPTX",
        )

    try:
        return await ideathon_service.upload_presentation_file(
            presentation_id, team_id, file, file.filename or "presentation"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/presentations/{presentation_id}/ready",
    response_model=PresentationResponse,
)
async def set_presentation_ready(
    presentation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Presentation:
    ideathon_service = IdeathonService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team",
        )

    try:
        presentation = await ideathon_service.set_ready(presentation_id, team_id)
        
        await manager.broadcast(
            f"competition:{presentation.competition_id}",
            {
                "type": "presentation_ready",
                "data": {
                    "presentation_id": presentation_id,
                    "team_id": team_id,
                },
            },
        )
        
        return presentation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/competitions/{competition_id}/generate-order",
    response_model=list[PresentationOrderResponse],
)
async def generate_presentation_order(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> list[Presentation]:
    ideathon_service = IdeathonService(db)

    try:
        presentations = await ideathon_service.generate_presentation_order(competition_id)
        
        await manager.broadcast(
            f"competition:{competition_id}",
            {
                "type": "presentation_order_generated",
                "data": {
                    "order": [
                        {
                            "team_id": p.team_id,
                            "order": p.presentation_order,
                        }
                        for p in presentations
                    ],
                },
            },
        )
        
        return presentations
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/presentations/{presentation_id}/start",
    response_model=PresentationResponse,
)
async def start_presentation(
    presentation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Presentation:
    ideathon_service = IdeathonService(db)

    try:
        presentation = await ideathon_service.start_presentation(presentation_id)
        
        await manager.broadcast(
            f"competition:{presentation.competition_id}",
            {
                "type": "presentation_started",
                "data": {
                    "presentation_id": presentation_id,
                    "team_id": presentation.team_id,
                    "order": presentation.presentation_order,
                },
            },
        )
        
        return presentation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/presentations/{presentation_id}/complete",
    response_model=PresentationResponse,
)
async def complete_presentation(
    presentation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> Presentation:
    ideathon_service = IdeathonService(db)

    try:
        presentation = await ideathon_service.complete_presentation(presentation_id)
        
        await manager.broadcast(
            f"competition:{presentation.competition_id}",
            {
                "type": "presentation_completed",
                "data": {
                    "presentation_id": presentation_id,
                    "team_id": presentation.team_id,
                },
            },
        )
        
        return presentation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/presentations/{presentation_id}/score",
    response_model=PresentationScoreResponse,
)
async def score_presentation(
    presentation_id: int,
    data: PresentationScoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> PresentationScore:
    ideathon_service = IdeathonService(db)

    try:
        return await ideathon_service.score_presentation(
            presentation_id=presentation_id,
            admin_id=current_user.id,
            category=data.category,
            score=data.score,
            max_score=data.max_score,
            feedback=data.feedback,
            criteria=data.criteria,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/presentations/{presentation_id}", response_model=PresentationWithScores
)
async def get_presentation(
    presentation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Presentation:
    ideathon_service = IdeathonService(db)

    presentation = await ideathon_service.get_presentation(presentation_id)
    if not presentation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )

    return presentation


@router.get(
    "/competitions/{competition_id}/queue",
)
async def get_presentation_queue(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    ideathon_service = IdeathonService(db)
    return await ideathon_service.get_presentation_queue(competition_id)


@router.get(
    "/competitions/{competition_id}/results",
)
async def get_presentation_results(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    ideathon_service = IdeathonService(db)
    return await ideathon_service.get_presentation_results(competition_id)


async def _get_user_team_id(db: AsyncSession, user_id: int) -> int | None:
    from sqlalchemy import select
    from app.domain.entities.team import TeamMember

    result = await db.execute(
        select(TeamMember.team_id).where(TeamMember.user_id == user_id)
    )
    row = result.first()
    return row[0] if row else None
