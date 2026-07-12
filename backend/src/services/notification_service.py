"""
Notification service: the single place that knows how to build and emit
each WSEvent type. Order/payment services call this instead of touching
`websocket.manager` directly, keeping WebSocket wiring out of business
logic (Single Responsibility Principle).
"""
import uuid
from datetime import datetime, timezone

from src.models.order import Order
from src.schemas.websocket import WSEvent
from src.websocket.manager import manager


async def _emit(order: Order, event: str, data: dict) -> None:
    ws_event = WSEvent(
        event=event,
        order_id=order.id,
        daily_order_id=order.daily_order_id,
        data=data,
        timestamp=datetime.now(timezone.utc),
    )
    if order.session_uuid:
        await manager.notify_session(order.session_uuid, ws_event)
    await manager.notify_order(order.id, ws_event)


async def notify_order_created(order: Order) -> None:
    await _emit(order, "order_created", {"status": order.status.value, "eta_minutes": order.eta_minutes})


async def notify_payment_success(order: Order) -> None:
    await _emit(order, "payment_success", {"status": order.status.value})


async def notify_order_status_changed(order: Order, previous_status: str) -> None:
    await _emit(
        order,
        "order_status_changed",
        {"previous_status": previous_status, "status": order.status.value},
    )


async def notify_order_ready(order: Order) -> None:
    await _emit(order, "order_ready", {"status": order.status.value})
