"""
Shared Pydantic v2 schema helpers: a consistent success/error envelope and
a generic pagination wrapper reused across all route responses.
"""
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    """Base class for schemas that read data from SQLAlchemy ORM objects."""
    model_config = ConfigDict(from_attributes=True)


class ErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
