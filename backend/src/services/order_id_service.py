"""
Generates daily, human-callable ("acoustic-proof") order IDs like A1, A2,
A3... The word "acoustic-proof" means staff can shout the ID across a noisy
kitchen without ambiguity -- so we deliberately avoid confusing characters
(no 0/O, 1/I mixups) by using a single fixed letter prefix + a plain
incrementing integer, reset every midnight.
"""
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.crud.operational import daily_counter_crud
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def generate_daily_order_id(db: AsyncSession, *, today: date | None = None) -> str:
    """
    Atomically generates the next order ID for the given day.

    Concurrency safety: `daily_counter_crud.increment_and_get` uses a
    row-level `SELECT ... FOR UPDATE` lock on the DailyCounter row, so two
    simultaneous order creations can never receive the same number -- the
    second transaction simply waits for the first to commit/release the
    lock before incrementing.
    """
    today = today or date.today()
    next_number = await daily_counter_crud.increment_and_get(
        db, day=today, prefix=settings.ORDER_ID_PREFIX
    )
    order_id = f"{settings.ORDER_ID_PREFIX}{next_number}"
    logger.debug("Generated daily order id %s for %s", order_id, today)
    return order_id
