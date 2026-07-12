from pydantic import BaseModel, Field

from src.schemas.common import ORMModel


class StoreStatusResponse(ORMModel):
    is_open: bool
    message: str | None = None


class StoreStatusUpdate(BaseModel):
    is_open: bool
    message: str | None = Field(default=None, max_length=255)
