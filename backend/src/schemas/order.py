import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer, model_validator

from src.config.settings import settings
from src.models.enums import OrderStatus, OrderType
from src.schemas.common import ORMModel


class OrderItemCreate(BaseModel):
    menu_item_id: uuid.UUID
    quantity: int = Field(gt=0, le=50)
    notes: str | None = Field(default=None, max_length=255)


class OrderCreate(BaseModel):
    session_uuid: uuid.UUID
    table_number: str | None = Field(default=None, max_length=20)
    order_type: OrderType
    items: list[OrderItemCreate] = Field(min_length=1)
    special_instructions: str | None = Field(default=None, max_length=1000)

    @field_validator("items")
    @classmethod
    def validate_max_items(cls, items: list[OrderItemCreate]) -> list[OrderItemCreate]:
        # Business rule: maximum 10 (distinct) line items per order.
        if len(items) > settings.MAX_ITEMS_PER_ORDER:
            raise ValueError(
                f"A maximum of {settings.MAX_ITEMS_PER_ORDER} items are allowed per order"
            )
        return items


class OrderStatusUpdate(BaseModel):
    """Payload for PATCH /api/orders/{id} - staff transitions order status."""
    status: OrderStatus


class OrderItemOut(ORMModel):
    id: uuid.UUID
    menu_item_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    notes: str | None
    name: str | None = None
    item_name: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('name', 'item_name')
    def serialize_name(self, value: str | None, _info):
        if value is not None:
            return value
        return None


class OrderOut(ORMModel):
    id: uuid.UUID
    daily_order_id: str
    session_uuid: uuid.UUID | None
    table_number: str | None
    order_type: OrderType
    status: OrderStatus
    total_amount: Decimal
    eta_minutes: int | None
    special_instructions: str | None
    items: list[OrderItemOut] = Field(default_factory=list)
    order_items: list[OrderItemOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='after')
    def sync_items_and_order_items(self) -> 'OrderOut':
        if not self.order_items and self.items:
            self.order_items = self.items
        elif not self.items and self.order_items:
            self.items = self.order_items
        return self


class OrderCreateResponse(BaseModel):
    """
    Returned immediately after POST /api/orders.
    For ONLINE orders, `razorpay_order_id` + `razorpay_key_id` are included
    so the frontend can open the Razorpay Checkout widget right away.
    """
    order: OrderOut
    razorpay_order_id: str | None = None
    razorpay_key_id: str | None = None
    amount_paise: int | None = None
