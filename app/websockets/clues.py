from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.websockets.manager import manager

router = APIRouter(tags=["Clue WebSocket"])


@router.websocket("/ws/clues/{competition_id}")
async def clues_websocket(
    websocket: WebSocket,
    competition_id: int,
    token: str | None = None,
) -> None:
    channel = f"clues:{competition_id}"

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
                    "message": "Connected to clue updates",
                    "competition_id": competition_id,
                },
                user_id,
            )

        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
