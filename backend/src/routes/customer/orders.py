import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.middleware.rate_limit import order_rate_limit_dependency
from src.models.enums import OrderStatus
from src.schemas.order import OrderCreate, OrderCreateResponse, OrderOut, OrderStatusUpdate
from src.services import order_service, payment_service, store_service
from src.utils.security import verify_admin_key

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post(
    "",
    response_model=OrderCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(order_rate_limit_dependency)],  # max 3 / 15 min per IP
)
async def create_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new order.

    - CASH orders are created with status UNPAID_CASH and go straight to
      the kitchen queue.
    - ONLINE orders are created with status PENDING_PAYMENT; the response
      includes everything the frontend needs to immediately open a
      Razorpay payment order (a convenience so the client doesn't need a
      second round trip).
    """
    store = await store_service.get_status(db)
    order = await order_service.create_order(db, payload=payload, store_is_open=store.is_open)

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
