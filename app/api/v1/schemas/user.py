from __future__ import annotations

from datetime import datetime

from pydantic import EmailStr, Field

from app.api.v1.schemas.base import BaseSchema
from app.domain.entities.user import UserRole


class UserCreate(BaseSchema):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=20)
    college: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    year_of_study: int | None = Field(default=None, ge=1, le=10)


class UserUpdate(BaseSchema):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    college: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    year_of_study: int | None = Field(default=None, ge=1, le=10)
    avatar_url: str | None = Field(default=None, max_length=500)


class UserResponse(BaseSchema):
    id: int
    email: str
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    avatar_url: str | None = None
    phone: str | None = None
    college: str | None = None
    department: str | None = None
    year_of_study: int | None = None
    created_at: datetime
    last_login: datetime | None = None


class UserLogin(BaseSchema):
    email: EmailStr
    password: str


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseSchema):
    refresh_token: str


class PasswordChange(BaseSchema):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
