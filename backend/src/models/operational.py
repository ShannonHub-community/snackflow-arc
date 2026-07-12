"""
Operational tables that back the order-ID generator, the kitchen queue /
ETA engine, and the nightly finance aggregation job.
"""
import uuid
from datetime import date as date_type

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base, TimestampMixin, UUIDPKMixin
from src.models.enums import KitchenQueueStatus


class DailyCounter(Base):
    """
    Single-row-per-day counter backing the acoustic-proof daily order IDs
    (A1, A2, A3, ...). Reset by the scheduler at 23:59 daily (a new row is
    naturally created the next day; old rows are kept for audit history).

    Row-level locking (SELECT ... FOR UPDATE) is used when incrementing to
    guarantee atomicity under concurrent order creation.
    """
    __tablename__ = "daily_counters"

    counter_date: Mapped[date_type] = mapped_column(Date, primary_key=True)
    prefix: Mapped[str] = mapped_column(String(5), default="A", nullable=False)
    last_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<DailyCounter {self.counter_date} last={self.last_number}>"


class KitchenQueue(Base, TimestampMixin, UUIDPKMixin):
    """
    Represents an order's position in the live kitchen queue. Used to
    compute dynamic ETA (queue depth * avg prep time) and to drive the
    kitchen-facing dashboard (out of scope here, but the data model
    supports it).
    """
    __tablename__ = "kitchen_queue"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[KitchenQueueStatus] = mapped_column(
        Enum(KitchenQueueStatus, name="kitchen_queue_status_enum"),
        default=KitchenQueueStatus.QUEUED,
        nullable=False,
    )

    order: Mapped["Order"] = relationship(back_populates="kitchen_entry")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<KitchenQueue order_id={self.order_id} pos={self.position}>"


class FinanceSummary(Base, TimestampMixin):
    """
    One row per day, written by the nightly scheduler job. Powers the
    (future) manager dashboard's daily revenue reports without needing to
    re-aggregate the full orders table on every request.
    """
    __tablename__ = "finance_summaries"

    summary_date: Mapped[date_type] = mapped_column(Date, primary_key=True)
    total_orders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_revenue: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    cash_revenue: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    online_revenue: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    cancelled_orders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<FinanceSummary {self.summary_date} revenue={self.total_revenue}>"
