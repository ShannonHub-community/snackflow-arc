from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.schemas.store import StoreStatusResponse, StoreStatusUpdate
from src.services import store_service
from src.utils.security import verify_admin_key

router = APIRouter(prefix="/api/store", tags=["Store"])


@router.get("/status", response_model=StoreStatusResponse)
async def get_store_status(db: AsyncSession = Depends(get_db)):
    """Public endpoint: is the store currently accepting orders?"""
    return await store_service.get_status(db)


@router.patch(
    "/status",
    response_model=StoreStatusResponse,
    dependencies=[Depends(verify_admin_key)],
)
async def patch_store_status(payload: StoreStatusUpdate, db: AsyncSession = Depends(get_db)):
    """Staff-only: open/close the store, optionally with a customer-facing message."""
    return await store_service.update_status(db, payload=payload)
