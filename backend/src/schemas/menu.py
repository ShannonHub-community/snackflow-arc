import uuid
from decimal import Decimal

from pydantic import BaseModel, Field

from src.schemas.common import ORMModel


class MenuCategoryOut(ORMModel):
    id: uuid.UUID
    name: str
    display_order: int


class MenuItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal = Field(gt=0, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=500)
    in_stock: bool = True
    prep_time_minutes: int = Field(default=5, ge=1, le=180)
    category_id: uuid.UUID


class MenuItemCreate(MenuItemBase):
    """Payload for POST /api/menu"""
    pass


class MenuItemUpdate(BaseModel):
    """Payload for PUT /api/menu/{id} - all fields optional for partial-safe updates."""
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=500)
    in_stock: bool | None = None
    prep_time_minutes: int | None = Field(default=None, ge=1, le=180)
    category_id: uuid.UUID | None = None


class MenuItemOut(ORMModel):
    id: uuid.UUID
    category_id: uuid.UUID
    name: str
    description: str | None
    price: Decimal
    image_url: str | None
    in_stock: bool
    prep_time_minutes: int
