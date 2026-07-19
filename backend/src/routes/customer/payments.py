from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.schemas.payment import (
    CreatePaymentOrderRequest,
    CreatePaymentOrderResponse,
    RefundOut,
    RefundRequest,
)
from src.services import payment_service
from src.utils.security import verify_admin_key

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-order", response_model=CreatePaymentOrderResponse)
async def create_payment_order(payload: CreatePaymentOrderRequest, db: AsyncSession = Depends(get_db)):
    """Creates a Razorpay order for an existing (PENDING_PAYMENT) SnackFlow order."""
    return await payment_service.create_payment_order(db, order_id=payload.order_id)


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(default="", alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Razorpay webhook endpoint. MUST read the raw request body (not
    `await request.json()`) so the HMAC signature check is performed
    against exactly the bytes Razorpay signed.
    """
    raw_body = await request.body()
    return await payment_service.verify_and_process_webhook(
        db, raw_body=raw_body, signature=x_razorpay_signature
    )


@router.post(
    "/refund",
    response_model=RefundOut,
    dependencies=[Depends(verify_admin_key)],
)
async def refund_payment(payload: RefundRequest, db: AsyncSession = Depends(get_db)):
    """
    Staff/manager-dashboard-only: issue a refund for a captured payment.
    `amount` omitted => full refund.
    """
    return await payment_service.refund(
        db,
        transaction_id=payload.transaction_id,
        amount=float(payload.amount) if payload.amount is not None else None,
        reason=payload.reason,
    )
