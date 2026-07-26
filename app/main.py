from __future__ import annotations

import logging
import os
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, ORJSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.api.v1.routes.health import router as health_router
from app.core.config import settings
from app.infrastructure.cache.redis import cache
from app.infrastructure.database.base import close_db, init_db
from app.websockets.manager import manager
from app.websockets.routes import router as ws_router
from app.websockets.quiz import router as quiz_ws_router
from app.websockets.debugging import router as debug_ws_router
from app.websockets.ideathon import router as ideathon_ws_router
from app.websockets.clues import router as clues_ws_router
from app.websockets.leaderboard import router as leaderboard_ws_router
from app.websockets.anticheat import router as anticheat_ws_router
from app.websockets.admin import router as admin_ws_router

try:
    from app.api.v1.routes.metrics import router as metrics_router, MetricsMiddleware
    HAS_METRICS = True
except ImportError:
    HAS_METRICS = False

logger = structlog.get_logger()


def _get_cors_origins() -> list[str]:
    origins = list(settings.CORS_ORIGINS)
    if "*" not in origins:
        origins.append("*")
    return origins


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting HackSphere", env=settings.APP_ENV, host=settings.HOST, port=settings.PORT)
    await cache.connect()
    await init_db()
    logger.info("Database initialized")
    yield
    await close_db()
    await cache.disconnect()
    logger.info("HackSphere shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise-grade Cloud-native Hackathon Management Platform",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if HAS_METRICS:
    app.add_middleware(MetricsMiddleware)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Any) -> Any:
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR",
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": "HTTP_ERROR",
        },
    )


app.include_router(api_router)
app.include_router(health_router)
if HAS_METRICS:
    app.include_router(metrics_router)
app.include_router(ws_router)
app.include_router(quiz_ws_router)
app.include_router(debug_ws_router)
app.include_router(ideathon_ws_router)
app.include_router(clues_ws_router)
app.include_router(leaderboard_ws_router)
app.include_router(anticheat_ws_router)
app.include_router(admin_ws_router)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
else:
    @app.get("/")
    async def root() -> dict[str, str]:
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs" if settings.is_development else "disabled",
        }
