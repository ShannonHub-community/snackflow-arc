import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel

WSEventType = Literal[
    "order_created",
    "payment_success",
    "order_status_changed",
    "order_ready",
]


class WSEvent(BaseModel):
    event: WSEventType
    order_id: uuid.UUID
    daily_order_id: str | None = None
    data: dict[str, Any] = {}
    timestamp: datetime
