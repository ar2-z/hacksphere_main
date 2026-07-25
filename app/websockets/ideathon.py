from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.websockets.manager import manager

router = APIRouter(tags=["Ideathon WebSocket"])


@router.websocket("/ws/ideathon/{competition_id}")
async def ideathon_websocket(
    websocket: WebSocket,
    competition_id: int,
    token: str | None = None,
) -> None:
    channel = f"ideathon:{competition_id}"

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
                    "message": "Connected to ideathon session",
                    "competition_id": competition_id,
                },
                user_id,
            )

        while True:
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "presentation_update":
                await manager.broadcast(
                    channel,
                    {
                        "type": "presentation_updated",
                        "data": {
                            "team_id": data.get("team_id"),
                            "competition_id": competition_id,
                        },
                    },
                )

            else:
                await manager.broadcast(channel, data)

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception:
        manager.disconnect(websocket, channel)
