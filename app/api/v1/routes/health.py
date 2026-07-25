from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.base import get_db
from app.infrastructure.cache.redis import cache
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    checks = {
        "api": "healthy",
        "database": "unhealthy",
        "cache": "healthy" if cache._use_memory else "unhealthy",
    }
    overall = "healthy"

    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        overall = "degraded"

    return {
        "status": overall,
        "checks": checks,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready"}


@router.get("/health/live")
async def liveness_check():
    return {"status": "alive"}
