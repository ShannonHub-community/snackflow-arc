"""
StoreStatus: a (practically) single-row table holding whether the store is
currently accepting orders, plus an optional customer-facing message
(e.g. "Back in 15 mins", "Closed for maintenance").
"""
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base, TimestampMixin


class StoreStatus(Base, TimestampMixin):
    __tablename__ = "store_status"

    # Fixed id=1 singleton row pattern -- simplest reliable way to model a
    # "single global switch" in a relational table without extra locking logic.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<StoreStatus is_open={self.is_open}>"
