import asyncio
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.schemas.menu import MenuItemCreate, MenuItemOut, MenuItemUpdate, MenuCategoryOut
from src.services import menu_service
from src.utils.security import verify_admin_key

router = APIRouter(prefix="/menu", tags=["Menu"])


@router.get("/categories", response_model=list[MenuCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Public endpoint. Returns all menu categories."""
    try:
        cats = await asyncio.wait_for(menu_service.list_categories(db), timeout=1.5)
        if cats:
            return cats
    except Exception as e:
        print(f"[MENU DIAGNOSTIC] Categories DB query fallback: {e}")

    return [
        MenuCategoryOut(id=uuid.UUID("00000000-0000-0000-0000-000000000001"), name="Beverages", display_order=1),
        MenuCategoryOut(id=uuid.UUID("00000000-0000-0000-0000-000000000002"), name="Mains", display_order=2)
    ]


@router.get("", response_model=list[MenuItemOut])
async def list_menu(all_items: bool = False, db: AsyncSession = Depends(get_db)):
    """Public endpoint. Returns items with Western menu demo fallback and live in_stock state."""
    try:
        from src.routes.admin.manager import GLOBAL_ITEM_STOCK
    except Exception:
        GLOBAL_ITEM_STOCK = {}

    try:
        db_items = await asyncio.wait_for(
            menu_service.list_all_items(db) if all_items else menu_service.list_in_stock_items(db),
            timeout=1.5
        )
        if db_items:
            return db_items
    except Exception as e:
        print(f"[MENU DIAGNOSTIC] DB menu fetch error/fallback: {e}")

    # Added image_url and prep_time_minutes to all demo items to fix Pydantic 500 error
    items = [
        MenuItemOut(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"), 
            name="Tea", 
            price=40.0, 
            category_id=uuid.UUID("00000000-0000-0000-0000-000000000001"), 
            in_stock=GLOBAL_ITEM_STOCK.get("prod_tea_001", True) and GLOBAL_ITEM_STOCK.get("11111111-1111-1111-1111-111111111111", True), 
            description='{"icon":"coffee","station":"Beverage Station"}',
            image_url="https://via.placeholder.com/150?text=Tea",
            prep_time_minutes=5
        ),
        MenuItemOut(
            id=uuid.UUID("22222222-2222-2222-2222-222222222222"), 
            name="Coffee", 
            price=60.0, 
            category_id=uuid.UUID("00000000-0000-0000-0000-000000000001"), 
            in_stock=GLOBAL_ITEM_STOCK.get("prod_coffee_001", True) and GLOBAL_ITEM_STOCK.get("22222222-2222-2222-2222-222222222222", True), 
            description='{"icon":"coffee","station":"Beverage Station"}',
            image_url="https://via.placeholder.com/150?text=Coffee",
            prep_time_minutes=5
        ),
        MenuItemOut(
            id=uuid.UUID("33333333-3333-3333-3333-333333333333"), 
            name="Pizza", 
            price=250.0, 
            category_id=uuid.UUID("00000000-0000-0000-0000-000000000002"), 
            in_stock=GLOBAL_ITEM_STOCK.get("prod_pizza_001", True) and GLOBAL_ITEM_STOCK.get("33333333-3333-3333-3333-333333333333", True), 
            description='{"icon":"pizza","station":"Oven Station"}',
            image_url="https://via.placeholder.com/150?text=Pizza",
            prep_time_minutes=15
        ),
        MenuItemOut(
            id=uuid.UUID("44444444-4444-4444-4444-444444444444"), 
            name="Pasta", 
            price=220.0, 
            category_id=uuid.UUID("00000000-0000-0000-0000-000000000002"), 
            in_stock=GLOBAL_ITEM_STOCK.get("prod_pasta_001", True) and GLOBAL_ITEM_STOCK.get("44444444-4444-4444-4444-444444444444", True), 
            description='{"icon":"pasta","station":"Oven Station"}',
            image_url="https://via.placeholder.com/150?text=Pasta",
            prep_time_minutes=12
        ),
        MenuItemOut(
            id=uuid.UUID("55555555-5555-5555-5555-555555555555"), 
            name="Sandwich", 
            price=120.0, 
            category_id=uuid.UUID("00000000-0000-0000-0000-000000000002"), 
            in_stock=GLOBAL_ITEM_STOCK.get("prod_sandwich_001", True) and GLOBAL_ITEM_STOCK.get("55555555-5555-5555-5555-555555555555", True), 
            description='{"icon":"sandwich","station":"Grill Station"}',
            image_url="https://via.placeholder.com/150?text=Sandwich",
            prep_time_minutes=8
        ),
        MenuItemOut(
            id=uuid.UUID("66666666-6666-6666-6666-666666666666"), 
            name="Burger", 
            price=150.0, 
            category_id=uuid.UUID("00000000-0000-0000-0000-000000000002"), 
            in_stock=GLOBAL_ITEM_STOCK.get("prod_burger_001", True) and GLOBAL_ITEM_STOCK.get("66666666-6666-6666-6666-666666666666", True), 
            description='{"icon":"burger","station":"Grill Station"}',
            image_url="https://via.placeholder.com/150?text=Burger",
            prep_time_minutes=10
        )
    ]
    
    if all_items:
        return items
    return [i for i in items if i.in_stock]


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