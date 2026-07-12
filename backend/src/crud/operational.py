from datetime import date as date_type

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.base import CRUDBase
from src.models.enums import KitchenQueueStatus
from src.models.operational import DailyCounter, FinanceSummary, KitchenQueue


class CRUDDailyCounter(CRUDBase[DailyCounter]):
    async def get_for_date(self, db: AsyncSession, day: date_type) -> DailyCounter | None:
        return await db.get(DailyCounter, day, with_for_update=True)

    async def increment_and_get(self, db: AsyncSession, day: date_type, prefix: str) -> int:
        """
        Atomically increments the counter for `day` and returns the new
        number. Relies on SELECT ... FOR UPDATE (row lock) so concurrent
        order creations never receive the same daily order number.
        """
        counter = await self.get_for_date(db, day)
        if counter is None:
            counter = DailyCounter(counter_date=day, prefix=prefix, last_number=1)
            db.add(counter)
        else:
            counter.last_number += 1
        await db.flush()
        return counter.last_number


class CRUDKitchenQueue(CRUDBase[KitchenQueue]):
    async def remove_stale(self, db: AsyncSession) -> int:
        """Clears DONE kitchen-queue rows during the nightly cleanup job."""
        result = await db.execute(
            delete(KitchenQueue).where(KitchenQueue.status == KitchenQueueStatus.DONE)
        )
        return result.rowcount or 0


class CRUDFinanceSummary(CRUDBase[FinanceSummary]):
    async def upsert(self, db: AsyncSession, summary: FinanceSummary) -> FinanceSummary:
        existing = await db.get(FinanceSummary, summary.summary_date)
        if existing:
            existing.total_orders = summary.total_orders
            existing.total_revenue = summary.total_revenue
            existing.cash_revenue = summary.cash_revenue
            existing.online_revenue = summary.online_revenue
            existing.cancelled_orders = summary.cancelled_orders
            await db.flush()
            return existing
        db.add(summary)
        await db.flush()
        return summary


daily_counter_crud = CRUDDailyCounter(DailyCounter)
kitchen_queue_crud = CRUDKitchenQueue(KitchenQueue)
finance_summary_crud = CRUDFinanceSummary(FinanceSummary)
