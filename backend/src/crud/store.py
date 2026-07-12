from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.base import CRUDBase
from src.models.store import StoreStatus

STORE_STATUS_SINGLETON_ID = 1


class CRUDStoreStatus(CRUDBase[StoreStatus]):
    async def get_singleton(self, db: AsyncSession) -> StoreStatus | None:
        result = await db.execute(
            select(StoreStatus).where(StoreStatus.id == STORE_STATUS_SINGLETON_ID)
        )
        return result.scalar_one_or_none()

    async def get_or_create(self, db: AsyncSession) -> StoreStatus:
        store = await self.get_singleton(db)
        if store is None:
            store = StoreStatus(id=STORE_STATUS_SINGLETON_ID, is_open=True, message=None)
            db.add(store)
            await db.flush()
            await db.refresh(store)
        return store


store_crud = CRUDStoreStatus(StoreStatus)
