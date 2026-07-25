from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.websockets.manager import manager

router = APIRouter(tags=["Leaderboard WebSocket"])


@router.websocket("/ws/leaderboard/{competition_id}")
async def leaderboard_websocket(
    websocket: WebSocket,
    competition_id: int,
    token: str | None = None,
) -> None:
    channel = f"leaderboard:{competition_id}"

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
                    "message": "Connected to leaderboard",
                    "competition_id": competition_id,
                },
                user_id,
            )

        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
