"""
Store status service: get/patch the singleton open/closed switch.
"""
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.store import store_crud
from src.models.store import StoreStatus
from src.schemas.store import StoreStatusUpdate
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def get_status(db: AsyncSession) -> StoreStatus:
    return await store_crud.get_or_create(db)


async def update_status(db: AsyncSession, *, payload: StoreStatusUpdate) -> StoreStatus:
    store = await store_crud.get_or_create(db)
    # NOTE: StoreStatusUpdate is a full-replace payload (unlike the partial
    # MenuItemUpdate), so we set fields directly instead of using the
    # generic CRUDBase.update (which skips None values for partial-update
    # semantics elsewhere). This lets staff explicitly clear `message`.
    store.is_open = payload.is_open
    store.message = payload.message
    await db.commit()
    await db.refresh(store)
    logger.info("Store status updated: is_open=%s", store.is_open)
    return store
