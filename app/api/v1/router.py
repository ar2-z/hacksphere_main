from fastapi import APIRouter

from app.api.v1.routes import (
    auth_router,
    users_router,
    teams_router,
    competitions_router,
    quiz_router,
    debugging_router,
    ideathon_router,
    clues_router,
    scores_router,
    admin_router,
)
from app.api.v1.routes.violations import router as violations_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(teams_router)
api_router.include_router(competitions_router)
api_router.include_router(quiz_router)
api_router.include_router(debugging_router)
api_router.include_router(ideathon_router)
api_router.include_router(clues_router)
api_router.include_router(scores_router)
api_router.include_router(admin_router)
api_router.include_router(violations_router)
