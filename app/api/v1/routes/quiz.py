from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.base import PaginatedResponse
from app.api.v1.schemas.quiz import (
    QuizAnswerResponse,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizQuestionWithAnswer,
    QuizRoundCreate,
    QuizRoundResponse,
    QuizRoundResult,
    QuizRoundWithQuestions,
    QuizSubmitAnswer,
)
from app.infrastructure.database.base import get_db
from app.middleware.auth import get_current_user, require_role
from app.domain.entities.user import User, UserRole
from app.services.quiz import QuizService
from app.websockets.manager import manager

router = APIRouter(prefix="/quiz", tags=["Quiz"])


@router.post(
    "/rounds",
    response_model=QuizRoundResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_round(
    competition_id: int,
    data: QuizRoundCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> QuizRound:
    quiz_service = QuizService(db)

    try:
        round_obj = await quiz_service.create_round(
            competition_id=competition_id,
            round_number=data.round_number,
            name=data.name,
            difficulty=data.difficulty,
            time_limit_seconds=data.time_limit_seconds,
            points_per_question=data.points_per_question,
            time_bonus_points=data.time_bonus_points,
            description=data.description,
            clue_id=data.clue_id,
        )

        for q in data.questions:
            await quiz_service.add_question(
                round_id=round_obj.id,
                question_text=q.question_text,
                options=q.options,
                correct_answer=q.correct_answer,
                order=q.order,
                question_type=q.question_type,
                points=q.points,
                time_limit_seconds=q.time_limit_seconds,
                explanation=q.explanation,
            )

        await db.refresh(round_obj)
        return round_obj
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get("/rounds", response_model=PaginatedResponse[QuizRoundResponse])
async def list_rounds(
    competition_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    quiz_service = QuizService(db)
    rounds = await quiz_service.get_competition_rounds(competition_id)

    start = (page - 1) * page_size
    end = start + page_size
    paginated_rounds = rounds[start:end]

    return {
        "data": [QuizRoundResponse.model_validate(r) for r in paginated_rounds],
        "total": len(rounds),
        "page": page,
        "page_size": page_size,
        "total_pages": (len(rounds) + page_size - 1) // page_size,
    }


@router.get("/rounds/{round_id}", response_model=QuizRoundResponse)
async def get_round(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizRound:
    quiz_service = QuizService(db)
    round_obj = await quiz_service.get_round(round_id)

    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found",
        )

    return round_obj


@router.get(
    "/rounds/{round_id}/questions",
    response_model=list[QuizQuestionResponse],
)
async def get_round_questions(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[QuizQuestion]:
    quiz_service = QuizService(db)
    round_obj = await quiz_service.get_round_with_questions(round_id)

    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found",
        )

    return round_obj.questions


@router.get(
    "/rounds/{round_id}/questions/answers",
    response_model=list[QuizQuestionWithAnswer],
)
async def get_round_questions_with_answers(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> list[QuizQuestion]:
    quiz_service = QuizService(db)
    round_obj = await quiz_service.get_round_with_questions(round_id)

    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found",
        )

    return round_obj.questions


@router.post("/rounds/{round_id}/start", response_model=QuizRoundResponse)
async def start_round(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> QuizRound:
    quiz_service = QuizService(db)

    try:
        round_obj = await quiz_service.start_round(round_id)
        
        await manager.broadcast(
            f"quiz:{round_obj.competition_id}:{round_id}",
            {
                "type": "round_started",
                "data": {
                    "round_id": round_id,
                    "round_number": round_obj.round_number,
                    "started_at": round_obj.started_at.isoformat() if round_obj.started_at else None,
                },
            },
        )
        
        return round_obj
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/rounds/{round_id}/pause", response_model=QuizRoundResponse)
async def pause_round(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> QuizRound:
    quiz_service = QuizService(db)

    try:
        round_obj = await quiz_service.pause_round(round_id)
        
        await manager.broadcast(
            f"quiz:{round_obj.competition_id}:{round_id}",
            {
                "type": "round_paused",
                "data": {
                    "round_id": round_id,
                    "round_number": round_obj.round_number,
                },
            },
        )
        
        return round_obj
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/rounds/{round_id}/resume", response_model=QuizRoundResponse)
async def resume_round(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> QuizRound:
    quiz_service = QuizService(db)

    try:
        round_obj = await quiz_service.resume_round(round_id)
        
        await manager.broadcast(
            f"quiz:{round_obj.competition_id}:{round_id}",
            {
                "type": "round_resumed",
                "data": {
                    "round_id": round_id,
                    "round_number": round_obj.round_number,
                },
            },
        )
        
        return round_obj
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/rounds/{round_id}/end", response_model=QuizRoundResponse)
async def end_round(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> QuizRound:
    quiz_service = QuizService(db)

    try:
        round_obj = await quiz_service.end_round(round_id)
        
        await manager.broadcast(
            f"quiz:{round_obj.competition_id}:{round_id}",
            {
                "type": "round_ended",
                "data": {
                    "round_id": round_id,
                    "round_number": round_obj.round_number,
                    "ended_at": round_obj.ended_at.isoformat() if round_obj.ended_at else None,
                },
            },
        )
        
        return round_obj
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/submit", response_model=QuizAnswerResponse)
async def submit_answer(
    data: QuizSubmitAnswer,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizAnswer:
    quiz_service = QuizService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to submit answers",
        )

    try:
        answer = await quiz_service.submit_answer(
            question_id=data.question_id,
            team_id=team_id,
            selected_answer=data.selected_answer,
            time_taken_seconds=data.time_taken_seconds,
        )
        
        question = await db.get(QuizQuestion, data.question_id)
        if question:
            round_obj = await quiz_service.get_round(question.round_id)
            if round_obj:
                await manager.broadcast(
                    f"quiz:{round_obj.competition_id}:{round_obj.id}",
                    {
                        "type": "answer_submitted",
                        "data": {
                            "team_id": team_id,
                            "question_id": data.question_id,
                            "is_correct": answer.is_correct,
                            "points_earned": answer.points_earned,
                        },
                    },
                )
        
        return answer
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/rounds/{round_id}/results", response_model=QuizRoundResult)
async def get_round_results(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    quiz_service = QuizService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to view results",
        )

    try:
        results = await quiz_service.get_round_results(round_id, team_id)
        return results
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/rounds/{round_id}/leaderboard")
async def get_round_leaderboard(
    round_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    quiz_service = QuizService(db)
    return await quiz_service.get_round_leaderboard(round_id)


@router.get("/progress")
async def get_quiz_progress(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    quiz_service = QuizService(db)

    team_id = await _get_user_team_id(db, current_user.id)
    if not team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be in a team to view progress",
        )

    return await quiz_service.get_team_progress(competition_id, team_id)


@router.post(
    "/questions",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_question(
    round_id: int,
    data: QuizQuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
) -> QuizQuestion:
    quiz_service = QuizService(db)

    try:
        return await quiz_service.add_question(
            round_id=round_id,
            question_text=data.question_text,
            options=data.options,
            correct_answer=data.correct_answer,
            order=data.order,
            question_type=data.question_type,
            points=data.points,
            time_limit_seconds=data.time_limit_seconds,
            explanation=data.explanation,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


async def _get_user_team_id(db: AsyncSession, user_id: int) -> int | None:
    from sqlalchemy import select
    from app.domain.entities.team import TeamMember

    result = await db.execute(
        select(TeamMember.team_id).where(TeamMember.user_id == user_id)
    )
    row = result.first()
    return row[0] if row else None
