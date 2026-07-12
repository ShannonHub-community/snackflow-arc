import uuid
from decimal import Decimal

from pydantic import BaseModel

from src.models.enums import PaymentStatus, RefundStatus
from src.schemas.common import ORMModel


class PaymentOut(ORMModel):
    id: uuid.UUID
    order_id: uuid.UUID
    gateway: str
    gateway_order_id: str | None
    gateway_payment_id: str | None
    amount: Decimal
    currency: str
    status: PaymentStatus


class CreatePaymentOrderRequest(BaseModel):
    order_id: uuid.UUID


class CreatePaymentOrderResponse(BaseModel):
    razorpay_order_id: str
    razorpay_key_id: str
    amount_paise: int
    currency: str


class RefundRequest(BaseModel):
    transaction_id: str
    amount: Decimal | None = None  # None => full refund
    reason: str | None = None


class RefundOut(ORMModel):
    id: uuid.UUID
    payment_id: uuid.UUID
    transaction_id: str
    gateway_refund_id: str | None
    amount: Decimal
    reason: str | None
    status: RefundStatus
