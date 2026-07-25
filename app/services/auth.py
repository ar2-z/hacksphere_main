from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.core.config import settings
from app.domain.entities.user import User


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def authenticate_user(self, email: str, password: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is None:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        if not user.is_active:
            return None

        return user

    async def create_user(
        self,
        email: str,
        username: str,
        full_name: str,
        password: str,
        **kwargs: dict,
    ) -> User:
        existing = await self.db.execute(
            select(User).where((User.email == email) | (User.username == username))
        )
        if existing.scalar_one_or_none():
            raise ValueError("User with this email or username already exists")

        user = User(
            email=email,
            username=username,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            **kwargs,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    def create_tokens(self, user: User) -> dict[str, str]:
        access_token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value, "email": user.email},
        )
        refresh_token = create_refresh_token(subject=user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def refresh_tokens(self, refresh_token: str) -> dict[str, str] | None:
        payload = decode_token(refresh_token)

        if payload is None:
            return None

        if payload.get("type") != "refresh":
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        result = await self.db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()

        if user is None or not user.is_active:
            return None

        return self.create_tokens(user)

    async def update_last_login(self, user: User) -> None:
        user.last_login = datetime.now(timezone.utc)
        await self.db.flush()
