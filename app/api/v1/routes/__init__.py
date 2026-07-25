from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.teams import router as teams_router
from app.api.v1.routes.competitions import router as competitions_router
from app.api.v1.routes.quiz import router as quiz_router
from app.api.v1.routes.debugging import router as debugging_router
from app.api.v1.routes.ideathon import router as ideathon_router
from app.api.v1.routes.clues import router as clues_router
from app.api.v1.routes.scores import router as scores_router
from app.api.v1.routes.admin import router as admin_router

__all__ = [
    "auth_router",
    "users_router",
    "teams_router",
    "competitions_router",
    "quiz_router",
    "debugging_router",
    "ideathon_router",
    "clues_router",
    "scores_router",
    "admin_router",
]
