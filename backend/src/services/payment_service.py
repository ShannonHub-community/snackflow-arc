"""
Payment service -- Razorpay integration.

Flow:
  1. Frontend creates a SnackFlow order (ONLINE) -> status PENDING_PAYMENT.
  2. Frontend calls POST /api/payments/create-order -> we create a Razorpay
     order and store gateway_order_id on our Payment row.
  3. Frontend opens Razorpay Checkout using the returned razorpay_order_id.
  4. Razorpay sends a `payment.captured` webhook -> we verify the HMAC
     signature, then (and ONLY then) mark Payment.status = PAID and
     Order.status = PAID, and push the order into the kitchen queue.

We never trust a client-side "payment succeeded" callback to update order
status -- only the server-verified webhook is authoritative.
"""

import json
import uuid

import razorpay
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.crud.operational import kitchen_queue_crud
from src.crud.order import order_crud
from src.crud.payment import payment_crud, refund_crud
from src.models.enums import (
    KitchenQueueStatus,
    OrderStatus,
    PaymentStatus,
    RefundStatus,
)
from src.models.operational import KitchenQueue
from src.models.payment import Payment, Refund
from src.services import notification_service
from src.utils.exceptions import (
    NotFoundError,
    PaymentError,
    ValidationError,
)
from src.utils.logger import get_logger
from src.utils.security import verify_razorpay_signature

logger = get_logger(__name__)


_client: razorpay.Client | None = None


def get_razorpay_client() -> razorpay.Client:
    global _client

    if _client is None:
        _client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET,
            )
        )

    return _client


async def create_payment_order(
    db: AsyncSession,
    *,
    order_id: uuid.UUID,
) -> dict:
    """Creates a Razorpay order for an existing SnackFlow order and persists a Payment row."""

    order = await order_crud.get(db, order_id)

    if order is None:
        raise NotFoundError(f"Order {order_id} not found")

    if order.status != OrderStatus.PENDING_PAYMENT:
        raise ValidationError(
            f"Order is in status {order.status.value}; "
            "only PENDING_PAYMENT orders can be paid online"
        )

    amount_paise = int(round(float(order.total_amount) * 100))

    client = get_razorpay_client()

    try:
        rzp_order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": order.daily_order_id,
                "notes": {
                    "order_id": str(order.id),
                    "daily_order_id": order.daily_order_id,
                },
            }
        )

    except Exception as exc:
        logger.error("Razorpay order creation failed: %s", exc)
        raise PaymentError(
            "Failed to create payment order with gateway"
        ) from exc

    payment = await payment_crud.get_by_order_id(db, order_id)

    if payment is None:
        payment = Payment(
            order_id=order.id,
            gateway="razorpay",
            gateway_order_id=rzp_order["id"],
            amount=order.total_amount,
            currency="INR",
            status=PaymentStatus.CREATED,
        )
        db.add(payment)

    else:
        payment.gateway_order_id = rzp_order["id"]
        payment.status = PaymentStatus.CREATED

    await db.commit()

    return {
        "razorpay_order_id": rzp_order["id"],
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "amount_paise": amount_paise,
        "currency": "INR",
    }


async def verify_and_process_webhook(
    db: AsyncSession,
    *,
    raw_body: bytes,
    signature: str,
) -> dict:
    """
    Verifies the Razorpay webhook signature and processes payment.captured events.
    """

    if not verify_razorpay_signature(
        raw_body,
        signature,
        settings.RAZORPAY_WEBHOOK_SECRET,
    ):
        logger.warning("Rejected webhook with invalid signature")
        raise PaymentError("Invalid webhook signature")

    payload = json.loads(raw_body)
    event = payload.get("event")

    if event != "payment.captured":
        logger.info("Ignoring webhook event type: %s", event)
        return {
            "status": "ignored",
            "event": event,
        }

    payment_entity = payload["payload"]["payment"]["entity"]

    gateway_order_id = payment_entity["order_id"]
    gateway_payment_id = payment_entity["id"]

    payment = await payment_crud.get_by_gateway_order_id(
        db,
        gateway_order_id,
    )

    if payment is None:
        logger.error(
            "Webhook for unknown gateway_order_id=%s",
            gateway_order_id,
        )
        raise NotFoundError(
            "Payment record not found for this gateway order"
        )

    if payment.status == PaymentStatus.PAID:
        logger.info(
            "Payment %s already marked PAID; ignoring duplicate webhook",
            payment.id,
        )
        return {
            "status": "already_processed",
        }

    payment.status = PaymentStatus.PAID
    payment.gateway_payment_id = gateway_payment_id
    payment.raw_webhook_payload = json.dumps(payload)

    order = await order_crud.get(db, payment.order_id)

    if order is None:
        raise NotFoundError(
            "Order linked to payment not found"
        )

    order.status = OrderStatus.PAID

    depth = await order_crud.count_active_kitchen_orders(db)

    kitchen_entry = KitchenQueue(
        order_id=order.id,
        position=depth + 1,
        status=KitchenQueueStatus.QUEUED,
    )

    db.add(kitchen_entry)

    await db.commit()

    order = await order_crud.get_with_items(db, order.id)

    await notification_service.notify_payment_success(order)

    logger.info(
        "Order %s marked PAID via webhook, sent to kitchen queue",
        order.daily_order_id,
    )

    return {
        "status": "processed",
        "order_id": str(order.id),
    }


async def refund(
    db: AsyncSession,
    *,
    transaction_id: str,
    amount: float | None,
    reason: str | None,
) -> Refund:
    """
    Internal refund function.

    `transaction_id` refers to gateway_payment_id captured on the Payment row.
    """

    payment = await payment_crud.get_by_gateway_payment_id(
        db,
        transaction_id,
    )

    if payment is None:
        raise NotFoundError(
            f"No payment found for transaction_id={transaction_id}"
        )

    refund_amount = (
        amount
        if amount is not None
        else float(payment.amount)
    )

    amount_paise = int(round(refund_amount * 100))

    client = get_razorpay_client()

    try:
        rzp_refund = client.payment.refund(
            transaction_id,
            {
                "amount": amount_paise,
                "notes": {
                    "reason": reason or "",
                },
            },
        )

    except Exception as exc:
        logger.error(
            "Razorpay refund failed for %s: %s",
            transaction_id,
            exc,
        )

        refund_record = Refund(
            payment_id=payment.id,
            transaction_id=transaction_id,
            amount=refund_amount,
            reason=reason,
            status=RefundStatus.FAILED,
        )

        db.add(refund_record)
        await db.commit()

        raise PaymentError(
            "Refund failed at payment gateway"
        ) from exc

    refund_record = Refund(
        payment_id=payment.id,
        transaction_id=transaction_id,
        gateway_refund_id=rzp_refund.get("id"),
        amount=refund_amount,
        reason=reason,
        status=RefundStatus.PROCESSED,
    )

    db.add(refund_record)

    full_refund = refund_amount >= float(payment.amount)

    payment.status = (
        PaymentStatus.REFUNDED
        if full_refund
        else PaymentStatus.PARTIALLY_REFUNDED
    )

    await db.commit()
    await db.refresh(refund_record)

    logger.info(
        "Refund processed: txn=%s amount=%s",
        transaction_id,
        refund_amount,
    )

    return refund_record