"""
Import every model module here so that:
  1. `Base.metadata` is fully populated for Alembic autogenerate.
  2. Relationship string references (e.g. "OrderItem") resolve correctly
     regardless of import order elsewhere in the app.
"""
from src.database.base import Base  # noqa: F401
from src.models.store import StoreStatus  # noqa: F401
from src.models.menu import MenuCategory, MenuItem  # noqa: F401
from src.models.session import Session  # noqa: F401
from src.models.order import Order, OrderItem  # noqa: F401
from src.models.payment import Payment, Refund  # noqa: F401
from src.models.operational import DailyCounter, KitchenQueue, FinanceSummary  # noqa: F401

__all__ = [
    "Base",
    "StoreStatus",
    "MenuCategory",
    "MenuItem",
    "Session",
    "Order",
    "OrderItem",
    "Payment",
    "Refund",
    "DailyCounter",
    "KitchenQueue",
    "FinanceSummary",
]
