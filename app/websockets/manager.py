from __future__ import annotations

import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.user_connections: dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str) -> None:
        if channel in self.active_connections:
            self.active_connections[channel].remove(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def send_personal_message(self, message: dict[str, Any], user_id: int) -> None:
        websocket = self.user_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
            except Exception:
                pass

    async def broadcast(self, channel: str, message: dict[str, Any]) -> None:
        if channel in self.active_connections:
            disconnected = []
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)

            for conn in disconnected:
                self.active_connections[channel].remove(conn)

    async def broadcast_to_competition(
        self, competition_id: int, message: dict[str, Any]
    ) -> None:
        channel = f"competition:{competition_id}"
        await self.broadcast(channel, message)

    async def broadcast_leaderboard(
        self, competition_id: int, leaderboard: dict[str, Any]
    ) -> None:
        message = {
            "type": "leaderboard_update",
            "data": leaderboard,
        }
        await self.broadcast_to_competition(competition_id, message)

    async def broadcast_timer(
        self, competition_id: int, timer_data: dict[str, Any]
    ) -> None:
        message = {
            "type": "timer_update",
            "data": timer_data,
        }
        await self.broadcast_to_competition(competition_id, message)

    async def broadcast_announcement(
        self, competition_id: int, announcement: dict[str, Any]
    ) -> None:
        message = {
            "type": "announcement",
            "data": announcement,
        }
        await self.broadcast_to_competition(competition_id, message)

    async def broadcast_score_update(
        self, competition_id: int, score_data: dict[str, Any]
    ) -> None:
        message = {
            "type": "score_update",
            "data": score_data,
        }
        await self.broadcast_to_competition(competition_id, message)


manager = ConnectionManager()
