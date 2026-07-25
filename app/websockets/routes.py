from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/competition/{competition_id}")
async def competition_websocket(
    websocket: WebSocket,
    competition_id: int,
    token: str | None = None,
) -> None:
    channel = f"competition:{competition_id}"

    if token:
        from app.core.security import decode_token
        payload = decode_token(token)
        if payload:
            user_id = int(payload.get("sub", 0))
            manager.user_connections[user_id] = websocket

    await manager.connect(websocket, channel)

    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(channel, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception:
        manager.disconnect(websocket, channel)


@router.websocket("/ws/leaderboard/{competition_id}")
async def leaderboard_websocket(
    websocket: WebSocket,
    competition_id: int,
) -> None:
    channel = f"leaderboard:{competition_id}"
    await manager.connect(websocket, channel)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@router.websocket("/ws/announcements/{competition_id}")
async def announcements_websocket(
    websocket: WebSocket,
    competition_id: int,
) -> None:
    channel = f"announcements:{competition_id}"
    await manager.connect(websocket, channel)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
