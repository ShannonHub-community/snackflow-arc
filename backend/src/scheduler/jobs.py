"""
Nightly job implementations (run at 23:59 daily, see scheduler/scheduler.py).

Each function opens and manages its own DB session since APScheduler jobs
run outside the normal request/response dependency-injection lifecycle.
"""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete

from src.crud.operational import daily_counter_crud, finance_summary_crud, kitchen_queue_crud
from src.crud.order import order_crud
from src.crud.session import session_crud
from src.database.session import AsyncSessionLocal
from src.models.enums import OrderStatus, OrderType
from src.models.operational import FinanceSummary
from src.models.session import Session as SessionModel
from src.utils.logger import get_logger
from src.utils.redis_client import get_redis

logger = get_logger(__name__)


async def reset_daily_order_counter() -> None:
    """
    Note: DailyCounter is keyed by date, so a fresh row is naturally
    created for the new day on the first order. This job exists to make
    the reset explicit/auditable and to pre-create tomorrow's row.
    """
    tomorrow = date.today() + timedelta(days=1)
    async with AsyncSessionLocal() as db:
        counter = await daily_counter_crud.get_for_date(db, tomorrow)
        if counter is None:
            from src.config.settings import settings
            counter = await daily_counter_crud.create(
                db, obj_in={"counter_date": tomorrow, "prefix": settings.ORDER_ID_PREFIX, "last_number": 0}
            )
        await db.commit()
    logger.info("Daily order counter prepared for %s", tomorrow)


async def remove_expired_sessions() -> None:
    async with AsyncSessionLocal() as db:
        expired = await session_crud.get_expired(db)
        for session_obj in expired:
            session_obj.is_active = False
        await db.commit()
    logger.info("Deactivated %d expired session(s)", len(expired))


async def aggregate_daily_finance_summary() -> None:
    """Rolls up today's orders into a FinanceSummary row for reporting."""
    today = date.today()
    async with AsyncSessionLocal() as db:
        orders = await order_crud.get_orders_for_date(db, datetime.now(timezone.utc))

        total_orders = len(orders)
        cancelled = sum(1 for o in orders if o.status == OrderStatus.CANCELLED)
        settled = [o for o in orders if o.status not in (OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT)]

        cash_revenue = sum(float(o.total_amount) for o in settled if o.order_type == OrderType.CASH)
        online_revenue = sum(float(o.total_amount) for o in settled if o.order_type == OrderType.ONLINE)

        summary = FinanceSummary(
            summary_date=today,
            total_orders=total_orders,
            total_revenue=cash_revenue + online_revenue,
            cash_revenue=cash_revenue,
            online_revenue=online_revenue,
            cancelled_orders=cancelled,
        )
        await finance_summary_crud.upsert(db, summary)
        await db.commit()
    logger.info(
        "Finance summary for %s: orders=%d revenue=%.2f", today, total_orders, cash_revenue + online_revenue
    )


async def clear_stale_cache() -> None:
    """Clears finished kitchen-queue rows and stale Redis rate-limit keys."""
    async with AsyncSessionLocal() as db:
        removed = await kitchen_queue_crud.remove_stale(db)
        await db.commit()
    logger.info("Removed %d stale kitchen queue row(s)", removed)

    redis_client = get_redis()
    cursor = 0
    deleted = 0
    pattern = "ratelimit:orders:*"
    while True:
        cursor, keys = await redis_client.scan(cursor=cursor, match=pattern, count=100)
        if keys:
            deleted += await redis_client.delete(*keys)
        if cursor == 0:
            break
    logger.info("Cleared %d stale rate-limit key(s) from Redis", deleted)


async def run_nightly_maintenance() -> None:
    """Entry point registered with APScheduler; runs all nightly jobs in order."""
    logger.info("Starting nightly maintenance job")
    await aggregate_daily_finance_summary()  # summarize BEFORE resetting anything
    await reset_daily_order_counter()
    await remove_expired_sessions()
    await clear_stale_cache()
    logger.info("Nightly maintenance job completed")
