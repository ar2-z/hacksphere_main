from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.websockets.manager import manager

router = APIRouter(tags=["Debugging WebSocket"])


@router.websocket("/ws/debug/{competition_id}/{challenge_id}")
async def debug_websocket(
    websocket: WebSocket,
    competition_id: int,
    challenge_id: int,
    token: str | None = None,
) -> None:
    channel = f"debug:{competition_id}:{challenge_id}"

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
                    "message": "Connected to debug session",
                    "challenge_id": challenge_id,
                },
                user_id,
            )

        while True:
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "code_submitted":
                await manager.broadcast(
                    channel,
                    {
                        "type": "submission_update",
                        "data": {
                            "team_id": data.get("team_id"),
                            "challenge_id": challenge_id,
                            "timestamp": "2024-01-01T00:00:00Z",
                        },
                    },
                )

            else:
                await manager.broadcast(channel, data)

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception:
        manager.disconnect(websocket, channel)
