"""
Menu domain models: MenuCategory (e.g. Starters, Beverages) and MenuItem.
"""
import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base, TimestampMixin, UUIDPKMixin


class MenuCategory(Base, TimestampMixin, UUIDPKMixin):
    __tablename__ = "menu_categories"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    items: Mapped[list["MenuItem"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MenuCategory {self.name}>"


class MenuItem(Base, TimestampMixin, UUIDPKMixin):
    __tablename__ = "menu_items"
    __table_args__ = (
        Index("ix_menu_items_in_stock", "in_stock"),
        Index("ix_menu_items_category_id", "category_id"),
    )

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_categories.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # rough prep time contributes to dynamic ETA calculation
    prep_time_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    category: Mapped["MenuCategory"] = relationship(back_populates="items")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="menu_item")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MenuItem {self.name} in_stock={self.in_stock}>"
