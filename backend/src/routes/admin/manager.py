from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, validator
from typing import List, Optional
import time

from src.middleware.admin_security import verify_manager_role
from src.config.settings import settings

router = APIRouter(tags=["manager"])

# Mock in-memory database for staff activity
mock_staff_activity = {
    "manager1": {
        "username": "manager1",
        "role": "manager",
        "last_active_timestamp": time.time(),
        "is_active": True
    },
    "staff1": {
        "username": "staff1",
        "role": "staff",
        "last_active_timestamp": time.time() - 300,  # 5 minutes ago
        "is_active": True
    }
}

# Mock in-memory database for pending refunds
mock_pending_refunds = [
    {
        "order_id": "A12",
        "customer_name": "John Doe",
        "amount": 150,
        "reason": "Item not available",
        "status": "Cancelled",
        "refund_preference": "Cash_At_Counter"
    },
    {
        "order_id": "A15",
        "customer_name": "Jane Smith",
        "amount": 200,
        "reason": "Wrong item delivered",
        "status": "Cancelled",
        "refund_preference": "Cash_At_Counter"
    }
]

class StoreStatusUpdate(BaseModel):
    status: str  # "Open", "Paused", or "Closed"

class StoreStatusResponse(BaseModel):
    success: bool
    status: str
    message: str

class HeartbeatResponse(BaseModel):
    success: bool
    message: str

class ActiveStaff(BaseModel):
    username: str
    role: str
    last_active_timestamp: float

class ActiveStaffResponse(BaseModel):
    success: bool
    active_staff: List[ActiveStaff]
    message: str

class StockUpdate(BaseModel):
    is_in_stock: bool

class StockUpdateResponse(BaseModel):
    success: bool
    item_id: str
    is_in_stock: bool
    message: str

class PendingRefund(BaseModel):
    order_id: str
    customer_name: str
    amount: int
    reason: str
    status: str
    refund_preference: str

class PendingRefundsResponse(BaseModel):
    success: bool
    pending_refunds: List[PendingRefund]
    message: str

class RefundResolveRequest(BaseModel):
    order_id: str
    resolution_method: str  # "cash" or "api"
    manager_pin: str
    
    @validator('resolution_method')
    def validate_resolution_method(cls, v):
        if v not in ["cash", "api"]:
            raise ValueError('resolution_method must be either "cash" or "api"')
        return v

class RefundResolveResponse(BaseModel):
    success: bool
    order_id: str
    resolution_method: str
    new_status: str
    message: str

class CashTodayResponse(BaseModel):
    expected_cash: int

GLOBAL_STORE_STATE = {
    "is_open": True,
    "status": "Open",
    "message": "Store is currently open and accepting orders."
}

GLOBAL_ITEM_STOCK = {
    "prod_tea_001": True,
    "prod_coffee_001": True,
    "prod_pizza_001": True,
    "prod_pasta_001": True,
    "prod_sandwich_001": True,
    "prod_burger_001": True,
    "11111111-1111-1111-1111-111111111111": True,
    "22222222-2222-2222-2222-222222222222": True,
    "33333333-3333-3333-3333-333333333333": True,
    "44444444-4444-4444-4444-444444444444": True,
    "55555555-5555-5555-5555-555555555555": True,
    "66666666-6666-6666-6666-666666666666": True,
}

@router.get("/store/status")
@router.put("/store/status")
@router.post("/store/status")
async def update_store_status(
    request: Optional[StoreStatusUpdate] = None
):
    if request:
        is_open = request.status in ["Open", "open", "true", "True"]
        GLOBAL_STORE_STATE["is_open"] = is_open
        GLOBAL_STORE_STATE["status"] = "Open" if is_open else "Closed"
        GLOBAL_STORE_STATE["message"] = "Store is open" if is_open else "Store is closed"

    return {
        "success": True,
        "is_open": GLOBAL_STORE_STATE["is_open"],
        "status": GLOBAL_STORE_STATE["status"],
        "message": GLOBAL_STORE_STATE["message"],
        "store_id": "store_hackathon_001"
    }

@router.post("/staff/heartbeat", response_model=HeartbeatResponse)
async def staff_heartbeat(
    user: dict = Depends(verify_manager_role)
):
    """
    Update the last_active_timestamp for the authenticated staff member.
    Requires manager role authentication.
    """
    username = user.get("sub")
    
    # Update last_active_timestamp in mock database
    if username in mock_staff_activity:
        mock_staff_activity[username]["last_active_timestamp"] = time.time()
        mock_staff_activity[username]["is_active"] = True
    else:
        # Add new staff member if not exists
        mock_staff_activity[username] = {
            "username": username,
            "role": user.get("role", "staff"),
            "last_active_timestamp": time.time(),
            "is_active": True
        }
    
    return HeartbeatResponse(
        success=True,
        message="Heartbeat recorded successfully"
    )

@router.get("/staff/active", response_model=ActiveStaffResponse)
async def get_active_staff(
    user: dict = Depends(verify_manager_role)
):
    """
    Get a list of active staff usernames and roles.
    Requires manager role authentication.
    """
    # Filter staff who have been active in the last 30 minutes
    current_time = time.time()
    active_staff_list = []
    
    for username, data in mock_staff_activity.items():
        # Consider staff active if they've had a heartbeat in the last 30 minutes
        if current_time - data["last_active_timestamp"] < 1800:
            active_staff_list.append(ActiveStaff(
                username=data["username"],
                role=data["role"],
                last_active_timestamp=data["last_active_timestamp"]
            ))
    
    return ActiveStaffResponse(
        success=True,
        active_staff=active_staff_list,
        message=f"Found {len(active_staff_list)} active staff members"
    )

@router.patch("/menu/{item_id}/stock", response_model=StockUpdateResponse)
@router.put("/menu/{item_id}/stock", response_model=StockUpdateResponse)
@router.post("/menu/{item_id}/stock", response_model=StockUpdateResponse)
async def update_menu_stock(
    item_id: str,
    stock_update: StockUpdate
):
    """
    Update the stock status of a menu item (hide/show).
    """
    is_stock = stock_update.is_in_stock
    GLOBAL_ITEM_STOCK[item_id] = is_stock
    
    return StockUpdateResponse(
        success=True,
        item_id=item_id,
        is_in_stock=is_stock,
        message=f"Menu item {item_id} stock status updated to {'in stock' if is_stock else 'out of stock'}"
    )

@router.get("/refunds/pending", response_model=PendingRefundsResponse)
async def get_pending_refunds(
    user: dict = Depends(verify_manager_role)
):
    """
    Get pending refunds where status is 'Cancelled' and refund preference is 'Cash_At_Counter'.
    Requires manager role authentication.
    """
    # Filter mock database for cancelled orders with Cash_At_Counter preference
    pending_refunds = [
        PendingRefund(**refund)
        for refund in mock_pending_refunds
        if refund["status"] == "Cancelled" and refund["refund_preference"] == "Cash_At_Counter"
    ]
    
    return PendingRefundsResponse(
        success=True,
        pending_refunds=pending_refunds,
        message=f"Found {len(pending_refunds)} pending refunds"
    )

@router.post("/refunds/resolve", response_model=RefundResolveResponse)
async def resolve_refund(
    request: RefundResolveRequest,
    user: dict = Depends(verify_manager_role)
):
    """
    Resolve a pending refund with manager PIN verification.
    Accepts order_id, resolution_method (cash or api), and manager_pin.
    Requires manager role authentication.
    """
    # Mock manager PIN verification
    # In real implementation, verify against stored manager PIN hash
    if request.manager_pin != settings.SUDO_PIN:  # PIN from env
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid manager PIN"
        )
    
    # Find the refund in mock database
    refund_index = -1
    for i, refund in enumerate(mock_pending_refunds):
        if refund["order_id"] == request.order_id:
            refund_index = i
            break
    
    if refund_index == -1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Refund not found"
        )
    
    # Update status based on resolution method
    if request.resolution_method == "cash":
        new_status = "Refund_Settled_Cash"
    else:  # api
        new_status = "Refund_Settled_API"
    
    # Update mock database
    mock_pending_refunds[refund_index]["status"] = new_status
    
    return RefundResolveResponse(
        success=True,
        order_id=request.order_id,
        resolution_method=request.resolution_method,
        new_status=new_status,
        message=f"Refund {request.order_id} resolved via {request.resolution_method}"
    )

@router.get("/reports/cash-today", response_model=CashTodayResponse)
async def get_cash_today(
    user: dict = Depends(verify_manager_role)
):
    """
    Get expected cash for today.
    Returns a single JSON object with expected_cash value.
    Requires manager role authentication.
    """
    # Mock expected cash calculation
    # In real implementation, query today's cash orders and sum amounts
    mock_expected_cash = 4500
    
    return CashTodayResponse(
        expected_cash=mock_expected_cash
    )
