from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.websockets.manager import manager

router = APIRouter(tags=["Admin WebSocket"])


@router.websocket("/ws/admin/{competition_id}")
async def admin_websocket(
    websocket: WebSocket,
    competition_id: int,
    token: str | None = None,
) -> None:
    channel = f"admin:{competition_id}"

    user_id = None
    if token:
        payload = decode_token(token)
        if payload:
            user_id = int(payload.get("sub", 0))
            role = payload.get("role")
            if role not in ("super_admin", "admin"):
                await websocket.close(code=4003, reason="Admin access required")
                return

    await manager.connect(websocket, channel)

    try:
        if user_id:
            await manager.send_personal_message(
                {
                    "type": "connected",
                    "message": "Connected to admin monitoring",
                    "competition_id": competition_id,
                },
                user_id,
            )

        while True:
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "admin_action":
                await manager.broadcast(
                    channel,
                    {
                        "type": "admin_action_broadcast",
                        "data": {
                            "user_id": user_id,
                            "action": data.get("action"),
                            "target": data.get("target"),
                        },
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception:
        manager.disconnect(websocket, channel)
