from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.domain.entities.user import User


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_user_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> User | None:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_users(
        self, skip: int = 0, limit: int = 20, search: str | None = None
    ) -> tuple[list[User], int]:
        query = select(User)

        if search:
            query = query.where(
                (User.email.ilike(f"%{search}%"))
                | (User.username.ilike(f"%{search}%"))
                | (User.full_name.ilike(f"%{search}%"))
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return users, total

    async def update_user(self, user: User, **kwargs: dict) -> User:
        for key, value in kwargs.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def change_password(
        self, user: User, current_password: str, new_password: str
    ) -> bool:
        if not verify_password(current_password, user.hashed_password):
            return False

        user.hashed_password = get_password_hash(new_password)
        await self.db.flush()
        return True

    async def deactivate_user(self, user: User) -> None:
        user.is_active = False
        await self.db.flush()

    async def activate_user(self, user: User) -> None:
        user.is_active = True
        await self.db.flush()
