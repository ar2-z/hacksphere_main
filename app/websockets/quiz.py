from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.websockets.manager import manager

router = APIRouter(tags=["Quiz WebSocket"])


@router.websocket("/ws/quiz/{competition_id}/{round_id}")
async def quiz_websocket(
    websocket: WebSocket,
    competition_id: int,
    round_id: int,
    token: str | None = None,
) -> None:
    channel = f"quiz:{competition_id}:{round_id}"

    user_id = None
    if token:
        payload = decode_token(token)
        if payload:
            user_id = int(payload.get("sub", 0))

    await manager.connect(websocket, channel)

    try:
        if user_id:
            await manager.send_personal_message(
                {
                    "type": "connected",
                    "message": "Connected to quiz session",
                    "round_id": round_id,
                },
                user_id,
            )

        while True:
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "answer_submitted":
                await manager.broadcast(
                    channel,
                    {
                        "type": "answer_update",
                        "data": {
                            "team_id": data.get("team_id"),
                            "question_id": data.get("question_id"),
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                    },
                )

            elif message_type == "request_timer":
                await manager.send_personal_message(
                    {
                        "type": "timer_sync",
                        "data": {
                            "round_id": round_id,
                            "server_time": datetime.now(timezone.utc).isoformat(),
                        },
                    },
                    user_id,
                )

            else:
                await manager.broadcast(channel, data)

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception:
        manager.disconnect(websocket, channel)


@router.websocket("/ws/quiz-timer/{competition_id}")
async def quiz_timer_websocket(
    websocket: WebSocket,
    competition_id: int,
    token: str | None = None,
) -> None:
    channel = f"quiz-timer:{competition_id}"

    await manager.connect(websocket, channel)

    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
