from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    model_config = {"from_attributes": True}


class BaseResponse(BaseSchema, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: T | None = None


class ErrorResponse(BaseSchema):
    success: bool = False
    message: str
    errors: list[dict[str, Any]] | None = None
    error_code: str | None = None


class SuccessResponse(BaseSchema):
    success: bool = True
    message: str = "Operation successful"


class PaginatedResponse(BaseSchema, Generic[T]):
    success: bool = True
    data: list[T] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0


class PaginationParams(BaseSchema):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
