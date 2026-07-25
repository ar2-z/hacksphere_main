from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.websockets.manager import manager

router = APIRouter(tags=["Anti-Cheat WebSocket"])


@router.websocket("/ws/anticheat/{competition_id}")
async def anticheat_websocket(
    websocket: WebSocket,
    competition_id: int,
    token: str | None = None,
) -> None:
    channel = f"anticheat:{competition_id}"

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
                    "message": "Connected to anti-cheat monitoring",
                    "competition_id": competition_id,
                },
                user_id,
            )

        while True:
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "violation_report":
                await manager.broadcast(
                    f"competition:{competition_id}",
                    {
                        "type": "admin_alert",
                        "data": {
                            "user_id": data.get("user_id"),
                            "violation_type": data.get("violation_type"),
                            "timestamp": "2024-01-01T00:00:00Z",
                        },
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception:
        manager.disconnect(websocket, channel)
