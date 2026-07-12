"""
Shared enums used across models, schemas, and services.
Using Python `str` enums so they serialize cleanly through Pydantic and are
stored as native PostgreSQL ENUM types via SQLAlchemy.
"""
import enum


class OrderType(str, enum.Enum):
    CASH = "CASH"
    ONLINE = "ONLINE"


class OrderStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"   # online order, awaiting webhook confirmation
    UNPAID_CASH = "UNPAID_CASH"           # cash order, to be paid at counter/table
    PAID = "PAID"                          # payment confirmed, sent to kitchen queue
    PREPARING = "PREPARING"                # kitchen actively preparing
    READY = "READY"                        # ready for pickup/serving
    COMPLETED = "COMPLETED"                # served / picked up, terminal state
    CANCELLED = "CANCELLED"                # cancelled, terminal state

    @classmethod
    def active_kitchen_states(cls) -> list["OrderStatus"]:
        """States that occupy a slot in the kitchen queue (used for ETA calc)."""
        return [cls.PAID, cls.PREPARING]

    @classmethod
    def terminal_states(cls) -> list["OrderStatus"]:
        return [cls.COMPLETED, cls.CANCELLED]


class PaymentStatus(str, enum.Enum):
    CREATED = "CREATED"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


class RefundStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class KitchenQueueStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
