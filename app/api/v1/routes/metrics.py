from prometheus_client import Counter, Histogram, Gauge, Info
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi import APIRouter, Response
import time
import psutil
import os

router = APIRouter(tags=["metrics"])

REQUEST_COUNT = Counter(
    'hacksphere_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'hacksphere_request_latency_seconds',
    'Request latency in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

ACTIVE_WEBSOCKETS = Gauge(
    'hacksphere_active_websockets',
    'Number of active WebSocket connections'
)

ACTIVE_TEAMS = Gauge(
    'hacksphere_active_teams',
    'Number of active teams'
)

VIOLATIONS_TOTAL = Counter(
    'hacksphere_violations_total',
    'Total number of violations',
    ['type']
)

SCORE_UPDATES = Counter(
    'hacksphere_score_updates_total',
    'Total number of score updates'
)

APP_INFO = Info(
    'hacksphere',
    'Application information'
)

APP_INFO.info({
    'version': '1.0.0',
    'environment': 'production'
})


class MetricsMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = time.time()
            method = scope["method"]
            path = scope["path"]

            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    status_code = message["status"]
                    duration = time.time() - start_time
                    REQUEST_COUNT.labels(method=method, endpoint=path, status_code=status_code).inc()
                    REQUEST_LATENCY.labels(method=method, endpoint=path).observe(duration)
                await send(message)

            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)


@router.get("/metrics")
async def metrics():
    metrics_data = generate_latest()
    return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)


@router.get("/metrics/system")
async def system_metrics():
    process = psutil.Process(os.getpid())
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory": {
            "total": psutil.virtual_memory().total,
            "available": psutil.virtual_memory().available,
            "percent": psutil.virtual_memory().percent,
        },
        "disk": {
            "total": psutil.disk_usage("/").total,
            "used": psutil.disk_usage("/").used,
            "percent": psutil.disk_usage("/").percent,
        },
        "process": {
            "pid": os.getpid(),
            "memory_info": process.memory_info()._asdict(),
            "num_threads": process.num_threads(),
        }
    }
