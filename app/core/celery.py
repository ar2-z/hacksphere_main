from __future__ import annotations

from celery import Celery

from app.core.config import settings

_is_memory = not settings.CELERY_BROKER_URL or settings.CELERY_BROKER_URL == "memory://"

celery_app = Celery(
    "hacksphere",
    broker=settings.CELERY_BROKER_URL if not _is_memory else None,
    backend=settings.CELERY_RESULT_BACKEND if not _is_memory else None,
)

if _is_memory:
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

celery_app.autodiscover_tasks(["app.tasks"])
