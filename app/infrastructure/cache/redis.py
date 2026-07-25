from __future__ import annotations

import json
import time
from typing import Any

from app.core.config import settings


class RedisCache:
    def __init__(self) -> None:
        self.redis_client: Any = None
        self._memory_store: dict[str, tuple[Any, float | None]] = {}
        self._use_memory = not settings.REDIS_URL or settings.REDIS_URL == "memory://"

    async def connect(self) -> None:
        if self._use_memory:
            return
        try:
            import redis.asyncio as redis
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            await self.redis_client.ping()
        except Exception:
            self._use_memory = True
            self.redis_client = None

    async def disconnect(self) -> None:
        if self.redis_client:
            await self.redis_client.close()

    async def get(self, key: str) -> Any | None:
        if self._use_memory:
            entry = self._memory_store.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if expiry and time.time() > expiry:
                del self._memory_store[key]
                return None
            return value
        if not self.redis_client:
            return None
        data = await self.redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set(
        self, key: str, value: Any, ttl: int | None = None
    ) -> None:
        if self._use_memory:
            expiry = time.time() + ttl if ttl else None
            self._memory_store[key] = (value, expiry)
            return
        if not self.redis_client:
            return
        data = json.dumps(value)
        if ttl:
            await self.redis_client.setex(key, ttl, data)
        else:
            await self.redis_client.set(key, data)

    async def delete(self, key: str) -> None:
        if self._use_memory:
            self._memory_store.pop(key, None)
            return
        if self.redis_client:
            await self.redis_client.delete(key)

    async def publish(self, channel: str, message: Any) -> None:
        if self._use_memory:
            return
        if self.redis_client:
            data = json.dumps(message)
            await self.redis_client.publish(channel, data)

    async def subscribe(self, channel: str) -> Any:
        if self._use_memory:
            raise RuntimeError("PubSub not available without Redis")
        if not self.redis_client:
            raise RuntimeError("Redis not connected")
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(channel)
        return pubsub


cache = RedisCache()
