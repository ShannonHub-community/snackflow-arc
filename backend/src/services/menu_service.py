"""
Menu service. Keeps route handlers free of persistence/business details
for menu management (SOLID: routes depend on this abstraction, not on
CRUD/ORM internals directly).
"""
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.crud.menu import menu_category_crud, menu_item_crud
from src.models.menu import MenuCategory, MenuItem
from src.schemas.menu import MenuItemCreate, MenuItemUpdate
from src.utils.exceptions import NotFoundError, ValidationError
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def list_in_stock_items(db: AsyncSession) -> list[MenuItem]:
    """GET /api/menu -- only ever returns items where in_stock = true."""
    return await menu_item_crud.get_in_stock(db)


async def list_all_items(db: AsyncSession) -> list[MenuItem]:
    """GET /api/menu?all_items=True -- returns all items."""
    return await menu_item_crud.get_multi(db)



async def list_categories(db: AsyncSession) -> list[MenuCategory]:
    """GET /api/menu/categories -- returns all menu categories."""
    return await menu_category_crud.get_multi(db)



async def get_item_or_404(db: AsyncSession, item_id: uuid.UUID) -> MenuItem:
    item = await menu_item_crud.get_by_id(db, item_id)
    if item is None:
        raise NotFoundError(f"Menu item {item_id} not found")
    return item


async def create_item(db: AsyncSession, *, payload: MenuItemCreate) -> MenuItem:
    category = await menu_category_crud.get(db, payload.category_id)
    if category is None:
        raise ValidationError(f"Category {payload.category_id} does not exist")

    item = await menu_item_crud.create(db, obj_in=payload.model_dump())
    await db.commit()
    await db.refresh(item)
    logger.info("Menu item created: %s (%s)", item.name, item.id)
    return item


async def update_item(db: AsyncSession, *, item_id: uuid.UUID, payload: MenuItemUpdate) -> MenuItem:
    item = await get_item_or_404(db, item_id)

    if payload.category_id is not None:
        category = await menu_category_crud.get(db, payload.category_id)
        if category is None:
            raise ValidationError(f"Category {payload.category_id} does not exist")

    updated = await menu_item_crud.update(
        db, db_obj=item, obj_in=payload.model_dump(exclude_unset=True)
    )
    await db.commit()
    await db.refresh(updated)
    logger.info("Menu item updated: %s (%s)", updated.name, updated.id)
    return updated


async def delete_item(db: AsyncSession, *, item_id: uuid.UUID) -> None:
    item = await get_item_or_404(db, item_id)
    await menu_item_crud.delete(db, db_obj=item)
    await db.commit()
    logger.info("Menu item deleted: %s", item_id)
