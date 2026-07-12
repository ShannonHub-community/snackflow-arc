import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.crud.base import CRUDBase
from src.models.menu import MenuCategory, MenuItem


class CRUDMenuItem(CRUDBase[MenuItem]):
    async def get_in_stock(self, db: AsyncSession) -> list[MenuItem]:
        """GET /api/menu must only ever return in_stock = true items."""
        result = await db.execute(
            select(MenuItem)
            .where(MenuItem.in_stock.is_(True))
            .order_by(MenuItem.category_id, MenuItem.name)
        )
        return list(result.scalars().all())

    async def get_by_id(self, db: AsyncSession, item_id: uuid.UUID) -> MenuItem | None:
        return await db.get(MenuItem, item_id)

    async def get_by_id_in_stock(self, db: AsyncSession, item_id: uuid.UUID) -> MenuItem | None:
        """Used by order creation: an item that just went out of stock must
        not be orderable even if the id is otherwise valid."""
        result = await db.execute(
            select(MenuItem).where(MenuItem.id == item_id, MenuItem.in_stock.is_(True))
        )
        return result.scalar_one_or_none()


class CRUDMenuCategory(CRUDBase[MenuCategory]):
    async def get_all_with_items(self, db: AsyncSession) -> list[MenuCategory]:
        result = await db.execute(
            select(MenuCategory)
            .options(selectinload(MenuCategory.items))
            .order_by(MenuCategory.display_order)
        )
        return list(result.scalars().all())


menu_item_crud = CRUDMenuItem(MenuItem)
menu_category_crud = CRUDMenuCategory(MenuCategory)
