import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.schemas.menu import MenuItemCreate, MenuItemOut, MenuItemUpdate
from src.services import menu_service
from src.utils.security import verify_admin_key

router = APIRouter(prefix="/api/menu", tags=["Menu"])


@router.get("", response_model=list[MenuItemOut])
async def list_menu(db: AsyncSession = Depends(get_db)):
    """Public endpoint. Only returns items where in_stock = true."""
    return await menu_service.list_in_stock_items(db)


@router.get("/{item_id}", response_model=MenuItemOut)
async def get_menu_item(item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await menu_service.get_item_or_404(db, item_id)


@router.post(
    "",
    response_model=MenuItemOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_admin_key)],
)
async def create_menu_item(payload: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    """Staff-only: add a new menu item."""
    return await menu_service.create_item(db, payload=payload)


@router.put(
    "/{item_id}",
    response_model=MenuItemOut,
    dependencies=[Depends(verify_admin_key)],
)
async def update_menu_item(item_id: uuid.UUID, payload: MenuItemUpdate, db: AsyncSession = Depends(get_db)):
    """Staff-only: update a menu item (e.g. toggle in_stock, change price)."""
    return await menu_service.update_item(db, item_id=item_id, payload=payload)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_admin_key)],
)
async def delete_menu_item(item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Staff-only: remove a menu item."""
    await menu_service.delete_item(db, item_id=item_id)
