import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.crud.base import CRUDBase
from src.models.enums import OrderStatus
from src.models.order import Order, OrderItem


class CRUDOrder(CRUDBase[Order]):
    async def get_with_items(self, db: AsyncSession, order_id: uuid.UUID) -> Order | None:
        result = await db.execute(
            select(Order)
            .options(
                selectinload(Order.items).selectinload(OrderItem.menu_item),
                selectinload(Order.payment),
            )
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def list_orders(
        self,
        db: AsyncSession,
        *,
        status: OrderStatus | None = None,
        session_uuid: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .order_by(Order.created_at.desc())
        )
        if status is not None:
            stmt = stmt.where(Order.status == status)
        if session_uuid is not None:
            stmt = stmt.where(Order.session_uuid == session_uuid)
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def has_active_unpaid_cash_order(
        self, db: AsyncSession, session_uuid: uuid.UUID
    ) -> bool:
        """
        Cash Lock check: does this session already have an active
        UNPAID_CASH order? Used to block creation of a second cash order
        from the same table/session before the first is settled.
        """
        result = await db.execute(
            select(func.count())
            .select_from(Order)
            .where(
                Order.session_uuid == session_uuid,
                Order.status == OrderStatus.UNPAID_CASH,
            )
        )
        return (result.scalar_one() or 0) > 0

    async def count_active_kitchen_orders(self, db: AsyncSession) -> int:
        """Current kitchen queue depth, used for dynamic ETA calculation."""
        result = await db.execute(
            select(func.count())
            .select_from(Order)
            .where(Order.status.in_(OrderStatus.active_kitchen_states()))
        )
        return result.scalar_one() or 0

    async def add_items(self, db: AsyncSession, items: list[OrderItem]) -> None:
        db.add_all(items)
        await db.flush()

    async def get_orders_for_date(self, db: AsyncSession, day: datetime) -> list[Order]:
        """Used by the nightly finance aggregation job."""
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        end_exclusive = start.replace(hour=23, minute=59, second=59, microsecond=999999)
        result = await db.execute(
            select(Order).where(Order.created_at >= start, Order.created_at <= end_exclusive)
        )
        return list(result.scalars().all())


order_crud = CRUDOrder(Order)
