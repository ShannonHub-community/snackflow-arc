import asyncio
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.middleware.rate_limit import order_rate_limit_dependency
from src.models.enums import OrderStatus
from src.schemas.order import OrderCreate, OrderCreateResponse, OrderOut, OrderStatusUpdate
from src.services import order_service, payment_service, store_service
from src.utils.security import verify_admin_key

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "",
    response_model=OrderCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(order_rate_limit_dependency)],  # max 3 / 15 min per IP
)
async def create_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new order.
    - CASH orders are created with status UNPAID_CASH and go straight to kitchen queue.
    - ONLINE orders are created with status PENDING_PAYMENT / PAID.
    """
    store_is_open = True
    try:
        store = await asyncio.wait_for(store_service.get_status(db), timeout=1.5)
        store_is_open = store.is_open
    except Exception:
        pass

    try:
        from src.routes.admin.manager import GLOBAL_STORE_STATE
        if not GLOBAL_STORE_STATE["is_open"]:
            store_is_open = False
    except Exception:
        pass
    order = await order_service.create_order(db, payload=payload, store_is_open=store_is_open)

    # Sync KDS station demand & counter orders in real time
    try:
        from src.routes.admin.kds import record_customer_order_demand
        from src.routes.admin.counter import record_counter_order

        raw_items = [{"menu_item_id": str(i.menu_item_id), "quantity": i.quantity} for i in payload.items]
        record_customer_order_demand(raw_items)

        formatted_items = []
        for i in order.items:
            formatted_items.append({
                "item_id": str(i.menu_item_id),
                "name": getattr(i, 'name', 'Item'),
                "quantity": i.quantity,
                "price": float(i.unit_price) if hasattr(i, 'unit_price') else 100.0,
                "notes": i.notes or ""
            })

        record_counter_order(
            daily_order_id=order.daily_order_id,
            customer_name=f"Table {order.table_number or '4'}",
            total_amount=float(order.total_amount),
            items=formatted_items,
            payment_method="online" if order.order_type.value == "ONLINE" else "cash"
        )
    except Exception as e:
        print(f"[SYNC WARNING] Failed to record order demand: {e}")

    response = OrderCreateResponse(order=order)
    if order.order_type.value == "ONLINE":
        payment_data = await payment_service.create_payment_order(db, order_id=order.id)
        response.razorpay_order_id = payment_data["razorpay_order_id"]
        response.razorpay_key_id = payment_data["razorpay_key_id"]
        response.amount_paise = payment_data["amount_paise"]
    return response


@router.get("", response_model=list[OrderOut])
async def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    session_uuid: uuid.UUID | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists orders. Pass `session_uuid` for a customer's own order history,
    or `status` for the kitchen dashboard (e.g. status=PAID,PREPARING).
    """
    return await order_service.list_orders(
        db, status=status_filter, session_uuid=session_uuid, skip=skip, limit=limit
    )


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await order_service.get_order_or_404(db, order_id)


@router.patch(
    "/{order_id}",
    response_model=OrderOut,
    dependencies=[Depends(verify_admin_key)],
)
async def update_order(order_id: uuid.UUID, payload: OrderStatusUpdate, db: AsyncSession = Depends(get_db)):
    """Staff-only: transition an order's status (e.g. PAID -> PREPARING -> READY)."""
    return await order_service.update_order_status(db, order_id=order_id, new_status=payload.status)


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_admin_key)],
)
async def delete_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Staff-only: cancel an order (soft delete -- sets status to CANCELLED)."""
    await order_service.cancel_order(db, order_id=order_id)
