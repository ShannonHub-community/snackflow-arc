"""
Order service -- the heart of SnackFlow's business logic. Route handlers
must never contain this logic directly; they only validate the HTTP
request/response shape and delegate here.
"""
import uuid
from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.crud.menu import menu_item_crud
from src.crud.operational import kitchen_queue_crud
from src.crud.order import order_crud
from src.crud.session import session_crud
from src.models.enums import KitchenQueueStatus, OrderStatus, OrderType
from src.models.operational import KitchenQueue
from src.models.order import Order, OrderItem
from src.schemas.order import OrderCreate
from src.services import notification_service
from src.services.eta_service import calculate_eta_minutes
from src.services.order_id_service import generate_daily_order_id
from src.utils.exceptions import ConflictError, NotFoundError, StoreClosedError, ValidationError
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def create_order(db: AsyncSession, *, payload: OrderCreate, store_is_open: bool) -> Order:
    """
    Creates a new order, enforcing all business rules:
      - store must be open
      - max N items per order (also validated at the schema level)
      - every menu item must exist AND be in_stock
      - Cash Lock: a session cannot have two simultaneous UNPAID_CASH orders
      - CASH orders -> status UNPAID_CASH immediately
      - ONLINE orders -> status PENDING_PAYMENT (advance to PAID only via
        verified webhook in payment_service.handle_payment_captured)
      - dynamic ETA is computed from current kitchen queue depth
    """
    if not store_is_open:
        raise StoreClosedError("The store is currently closed and not accepting orders.")

    if len(payload.items) > settings.MAX_ITEMS_PER_ORDER:
        raise ValidationError(f"A maximum of {settings.MAX_ITEMS_PER_ORDER} items are allowed per order")

    # Ensure the session exists (idempotent create-if-missing).
    await session_crud.get_or_create(db, payload.session_uuid, payload.table_number)

    # Cash Lock check -- must happen before creating a new CASH order.
    if payload.order_type == OrderType.CASH:
        already_locked = await order_crud.has_active_unpaid_cash_order(db, payload.session_uuid)
        if already_locked:
            raise ConflictError(
                "This session already has an unpaid cash order. Please settle it before "
                "placing another cash order.",
                error_code="CASH_LOCK_ACTIVE",
            )

    # Validate menu items and compute totals server-side (never trust client prices).
    resolved_items: list[dict] = []
    item_prep_times: dict[uuid.UUID, int] = {}
    total_amount = 0

    for line in payload.items:
        menu_item = await menu_item_crud.get_by_id_in_stock(db, line.menu_item_id)
        if menu_item is None:
            raise ValidationError(f"Menu item {line.menu_item_id} is not available")

        subtotal = float(menu_item.price) * line.quantity
        total_amount += subtotal
        item_prep_times[menu_item.id] = menu_item.prep_time_minutes
        resolved_items.append(
            {
                "menu_item_id": menu_item.id,
                "quantity": line.quantity,
                "unit_price": menu_item.price,
                "subtotal": subtotal,
                "notes": line.notes,
            }
        )

    initial_status = (
        OrderStatus.UNPAID_CASH if payload.order_type == OrderType.CASH else OrderStatus.PENDING_PAYMENT
    )

    daily_order_id = await generate_daily_order_id(db)

    order = Order(
        daily_order_id=daily_order_id,
        order_date=datetime.now(timezone.utc),
        session_uuid=payload.session_uuid,
        table_number=payload.table_number,
        order_type=payload.order_type,
        status=initial_status,
        total_amount=total_amount,
        special_instructions=payload.special_instructions,
    )
    db.add(order)
    await db.flush()  # populate order.id for FK references below

    order_items = [OrderItem(order_id=order.id, **item) for item in resolved_items]
    await order_crud.add_items(db, order_items)

    # CASH orders go straight to the kitchen (payment collected at counter);
    # ONLINE orders only enter the kitchen queue once payment is confirmed.
    if initial_status == OrderStatus.UNPAID_CASH:
        await _enqueue_to_kitchen(db, order)

    order.eta_minutes = await calculate_eta_minutes(
        db, order_items=order_items, item_prep_times=item_prep_times
    )

    await db.commit()
    # Re-fetch (rather than a partial refresh) to reliably eager-load both
    # plain columns and the `items` relationship in one consistent query --
    # a partial `db.refresh(order, attribute_names=["items"])` can leave
    # other attributes in a state that triggers a lazy-load outside of an
    # async-safe context when Pydantic later serializes the object.
    order = await order_crud.get_with_items(db, order.id)

    await notification_service.notify_order_created(order)
    logger.info("Order %s created (%s, %s)", order.daily_order_id, order.order_type, order.status)
    return order


async def _enqueue_to_kitchen(db: AsyncSession, order: Order) -> None:
    """Adds the order to the live kitchen queue (position = current depth + 1)."""
    depth = await order_crud.count_active_kitchen_orders(db)
    entry = KitchenQueue(order_id=order.id, position=depth + 1, status=KitchenQueueStatus.QUEUED)
    db.add(entry)
    await db.flush()


async def get_order_or_404(db: AsyncSession, order_id: uuid.UUID) -> Order:
    order = await order_crud.get_with_items(db, order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return order


async def list_orders(
    db: AsyncSession,
    *,
    status: OrderStatus | None = None,
    session_uuid: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Order]:
    return await order_crud.list_orders(
        db, status=status, session_uuid=session_uuid, skip=skip, limit=limit
    )


async def update_order_status(db: AsyncSession, *, order_id: uuid.UUID, new_status: OrderStatus) -> Order:
    """
    Staff-driven status transition (kitchen dashboard). Emits
    `order_status_changed`, and additionally `order_ready` when the new
    status is READY, since the frontend treats that as a distinct,
    higher-priority notification (e.g. push notification / sound alert).
    """
    order = await get_order_or_404(db, order_id)
    previous_status = order.status.value

    _validate_transition(order.status, new_status)

    order.status = new_status
    await db.commit()
    order = await order_crud.get_with_items(db, order.id)

    await notification_service.notify_order_status_changed(order, previous_status)
    if new_status == OrderStatus.READY:
        await notification_service.notify_order_ready(order)

    logger.info("Order %s status changed %s -> %s", order.daily_order_id, previous_status, new_status)
    return order


def _validate_transition(current: OrderStatus, target: OrderStatus) -> None:
    if current in OrderStatus.terminal_states():
        raise ConflictError(f"Order is already in terminal state {current.value}")

    allowed: dict[OrderStatus, set[OrderStatus]] = {
        OrderStatus.PENDING_PAYMENT: {OrderStatus.PAID, OrderStatus.CANCELLED},
        OrderStatus.UNPAID_CASH: {OrderStatus.PAID, OrderStatus.CANCELLED},
        OrderStatus.PAID: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
        OrderStatus.PREPARING: {OrderStatus.READY, OrderStatus.CANCELLED},
        OrderStatus.READY: {OrderStatus.COMPLETED},
    }
    if target not in allowed.get(current, set()):
        raise ValidationError(f"Cannot transition order from {current.value} to {target.value}")


async def cancel_order(db: AsyncSession, *, order_id: uuid.UUID) -> None:
    """
    DELETE /api/orders/{id}: soft-cancel rather than hard delete, so
    financial/audit history is preserved. Terminal orders cannot be
    cancelled twice.
    """
    order = await get_order_or_404(db, order_id)
    if order.status in OrderStatus.terminal_states():
        raise ConflictError(f"Order is already {order.status.value} and cannot be cancelled")

    previous_status = order.status.value
    order.status = OrderStatus.CANCELLED
    await db.commit()
    order = await order_crud.get_with_items(db, order.id)

    await notification_service.notify_order_status_changed(order, previous_status)
    logger.info("Order %s cancelled", order.daily_order_id)
