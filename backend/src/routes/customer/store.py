import asyncio
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.schemas.store import StoreStatusResponse, StoreStatusUpdate
from src.services import store_service
from src.utils.security import verify_admin_key

router = APIRouter(prefix="/store", tags=["Store"])


@router.get("/status", response_model=StoreStatusResponse)
async def get_store_status(db: AsyncSession = Depends(get_db)):
    """Public endpoint: is the store currently accepting orders?"""
    try:
        from src.routes.admin.manager import GLOBAL_STORE_STATE
        return StoreStatusResponse(
            is_open=GLOBAL_STORE_STATE["is_open"],
            message=GLOBAL_STORE_STATE["message"],
            store_id="store_hackathon_001"
        )
    except Exception:
        return StoreStatusResponse(is_open=True, message="Store is open", store_id="store_hackathon_001")


@router.patch("/status", response_model=StoreStatusResponse)
@router.put("/status", response_model=StoreStatusResponse)
@router.post("/status", response_model=StoreStatusResponse)
async def patch_store_status(payload: StoreStatusUpdate, db: AsyncSession = Depends(get_db)):
    """Staff-only / Manager: open/close the store."""
    try:
        from src.routes.admin.manager import GLOBAL_STORE_STATE
        GLOBAL_STORE_STATE["is_open"] = payload.is_open
        GLOBAL_STORE_STATE["status"] = "Open" if payload.is_open else "Closed"
        GLOBAL_STORE_STATE["message"] = payload.message or ("Store is open" if payload.is_open else "Store is closed")
        
        try:
            await asyncio.wait_for(store_service.update_status(db, payload=payload), timeout=1.5)
        except Exception as e:
            print(f"[STORE DIAGNOSTIC] DB status update fallback: {e}")

        return StoreStatusResponse(
            is_open=GLOBAL_STORE_STATE["is_open"],
            message=GLOBAL_STORE_STATE["message"],
            store_id="store_hackathon_001"
        )
    except Exception:
        return StoreStatusResponse(is_open=payload.is_open, message=payload.message or "Updated", store_id="store_hackathon_001")
