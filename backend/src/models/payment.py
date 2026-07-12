"""
Payment: one row per order representing the gateway (Razorpay/Stripe)
transaction lifecycle. Refund: internal record of refunds issued against
a payment, used by the (future) manager dashboard.
"""
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base, TimestampMixin, UUIDPKMixin
from src.models.enums import PaymentStatus, RefundStatus


class Payment(Base, TimestampMixin, UUIDPKMixin):
    __tablename__ = "payments"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    gateway: Mapped[str] = mapped_column(String(30), default="razorpay", nullable=False)
    gateway_order_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    gateway_payment_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum"),
        default=PaymentStatus.CREATED,
        nullable=False,
    )
    raw_webhook_payload: Mapped[str | None] = mapped_column(Text, nullable=True)

    order: Mapped["Order"] = relationship(back_populates="payment")
    refunds: Mapped[list["Refund"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Payment order_id={self.order_id} status={self.status}>"


class Refund(Base, TimestampMixin, UUIDPKMixin):
    __tablename__ = "refunds"

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False
    )
    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False)
    gateway_refund_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[RefundStatus] = mapped_column(
        Enum(RefundStatus, name="refund_status_enum"),
        default=RefundStatus.INITIATED,
        nullable=False,
    )

    payment: Mapped["Payment"] = relationship(back_populates="refunds")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Refund txn={self.transaction_id} status={self.status}>"
