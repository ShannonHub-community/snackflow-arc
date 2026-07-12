"""
Dynamic ETA calculation.

ETA = base prep time for THIS order's own items (max prep time among its
items, since items are usually prepared in parallel by different stations)
+ (current kitchen queue depth * average time added per order ahead in
the queue). This is a pragmatic heuristic that captures the fact that a
busier kitchen means a longer wait, without needing a full simulation.
"""
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.settings import settings
from src.crud.order import order_crud
from src.models.order import OrderItem
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def calculate_eta_minutes(
    db: AsyncSession, *, order_items: list[OrderItem], item_prep_times: dict
) -> int:
    """
    :param order_items: OrderItem rows for the order being created (not yet committed)
    :param item_prep_times: mapping of menu_item_id -> prep_time_minutes
    """
    own_prep_time = max(
        (item_prep_times.get(item.menu_item_id, settings.BASE_PREP_TIME_MINUTES) for item in order_items),
        default=settings.BASE_PREP_TIME_MINUTES,
    )

    queue_depth = await order_crud.count_active_kitchen_orders(db)
    queue_delay = queue_depth * settings.AVG_TIME_PER_QUEUED_ORDER_MINUTES

    eta = own_prep_time + queue_delay
    logger.debug(
        "ETA calc: own_prep=%s queue_depth=%s queue_delay=%s -> eta=%s",
        own_prep_time, queue_depth, queue_delay, eta,
    )
    return eta
