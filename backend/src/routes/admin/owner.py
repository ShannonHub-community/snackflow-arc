from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
import base64
import io
import qrcode

from src.middleware.admin_security import verify_owner_role, verify_sudo_pin, SudoPinRequest
from src.schemas.admin_schemas import StoreConfig, MenuItemCreate, MenuItemUpdate, MenuItemResponse
router = APIRouter(prefix="/api/owner", tags=["owner"])

# Mock in-memory database for store configuration
mock_store_config = {
    "store_name": "SnackFlow Cafe",
    "address": "123 Main Street, Bangalore",
    "auto_open": "09:00",
    "auto_close": "22:00",
    "phone": "+91-9876543210",
    "email": "contact@snackflow.com",
    "currency": "INR",
    "tax_rate": 5.0
}

# Mock in-memory database for menu items
mock_menu_items = {
    "prod_dosa_001": {
        "id": "prod_dosa_001",
        "name": "Masala Dosa",
        "price": 80.0,
        "category": "South Indian",
        "station": "Dosa Station",
        "icon": "dosa-icon-svg",
        "is_available": True,
        "is_active": True,
        "description": "Crispy dosa with spiced potato filling"
    }
}

class StaffCreateRequest(BaseModel):
    username: str
    password: str
    role: str  # "manager" or "staff"

class StaffCreateResponse(BaseModel):
    success: bool
    username: str
    role: str
    message: str

class RefundRequest(BaseModel):
    order_id: str
    amount: int
    reason: str
    sudo_pin: str

class RefundResponse(BaseModel):
    success: bool
    order_id: str
    refunded_amount: int
    message: str

class QRCodeResponse(BaseModel):
    success: bool
    qr_code: str  # Base64 encoded QR code
    message: str

# Store endpoints
@router.get("/store", response_model=StoreConfig)
async def get_store_config(user: dict = Depends(verify_owner_role)):
    """
    Get store configuration.
    Requires owner role authentication.
    """
    return StoreConfig(**mock_store_config)

@router.put("/store", response_model=StoreConfig)
async def update_store_config(
    config: StoreConfig,
    user: dict = Depends(verify_owner_role)
):
    """
    Update store configuration.
    Requires owner role authentication.
    Mock database write.
    """
    # Update mock database
    mock_store_config.update(config.dict())
    
    return StoreConfig(**mock_store_config)

# QR Code generation endpoint
@router.get("/qr-generate", response_model=QRCodeResponse)
async def generate_qr_code(user: dict = Depends(verify_owner_role)):
    """
    Generate QR code for the store menu.
    Returns Base64 encoded QR code for frontend rendering.
    """
    # Mock URL for QR code
    menu_url = "https://snackflow.com/menu/CAFE-882"
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(menu_url)
    qr.make(fit=True)
    
    # Create image and convert to Base64
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return QRCodeResponse(
        success=True,
        qr_code=img_str,
        message="QR code generated successfully"
    )

@router.post("/menu", response_model=MenuItemResponse)
async def create_menu_item(
    item: MenuItemCreate,
    user: dict = Depends(verify_owner_role)
):
    """
    Create a new menu item.
    Requires owner role authentication.
    Uses Pydantic schema for validation.
    """
    # Check if item ID already exists
    if item.id in mock_menu_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Menu item with this ID already exists"
        )
    
    # Add to mock database
    mock_menu_items[item.id] = {
        "id": item.id,
        "name": item.name,
        "price": item.price,
        "category": item.category,
        "station": item.station,
        "icon": item.icon,
        "is_available": item.is_available,
        "is_active": True,
        "description": item.description
    }
    
    return MenuItemResponse(
        id=item.id,
        name=item.name,
        price=item.price,
        category=item.category,
        station=item.station,
        icon=item.icon,
        is_available=item.is_available,
        description=item.description,
        is_active=True
    )

@router.put("/menu/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    item_id: str,
    item: MenuItemUpdate,
    user: dict = Depends(verify_owner_role)
):
    """
    Update an existing menu item.
    Requires owner role authentication.
    Uses Pydantic schema for validation.
    """
    # Check if item exists
    if item_id not in mock_menu_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found"
        )
    
    # Update mock database
    mock_menu_items[item_id].update({
        "name": item.name,
        "price": item.price,
        "category": item.category,
        "station": item.station,
        "icon": item.icon,
        "is_available": item.is_available,
        "description": item.description
    })
    
    updated_item = mock_menu_items[item_id]
    
    return MenuItemResponse(
        id=updated_item["id"],
        name=updated_item["name"],
        price=updated_item["price"],
        category=updated_item["category"],
        station=updated_item["station"],
        icon=updated_item["icon"],
        is_available=updated_item["is_available"],
        description=updated_item.get("description"),
        is_active=updated_item["is_active"]
    )

@router.delete("/menu/{item_id}")
async def delete_menu_item(
    item_id: str,
    user: dict = Depends(verify_owner_role)
):
    """
    Soft delete a menu item (sets is_active to false).
    Requires owner role authentication.
    Does not hard delete from database.
    """
    # Check if item exists
    if item_id not in mock_menu_items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found"
        )
    
    # Soft delete - update is_active flag
    mock_menu_items[item_id]["is_active"] = False
    
    return {
        "success": True,
        "message": f"Menu item {item_id} soft deleted successfully",
        "item_id": item_id
    }

@router.post("/staff", response_model=StaffCreateResponse)
async def create_staff(
    request: StaffCreateRequest,
    user: dict = Depends(verify_owner_role)
):
    """
    Provision staff credentials.
    Requires owner role authentication.
    Mock bcrypt hashing to be implemented.
    """
    # Mock bcrypt hashing (to be implemented with actual hashing)
    # TODO: Implement actual password hashing using bcrypt
    # TODO: Store staff credentials in Supabase
    
    return StaffCreateResponse(
        success=True,
        username=request.username,
        role=request.role,
        message=f"Staff {request.username} created successfully with role {request.role}"
    )

@router.post("/finance/refund", response_model=RefundResponse)
async def process_refund(
    request: RefundRequest,
    user: dict = Depends(verify_owner_role)
):
    """
    Process a refund for an order.
    Requires owner role authentication AND Sudo PIN verification.
    """
    # Verify Sudo PIN
    sudo_request = SudoPinRequest(sudo_pin=request.sudo_pin)
    await verify_sudo_pin(sudo_request)
    
    # TODO: Implement actual refund processing with Supabase
    # TODO: Update order status and payment records
    
    return RefundResponse(
        success=True,
        order_id=request.order_id,
        refunded_amount=request.amount,
        message=f"Refund of {request.amount} INR processed for order {request.order_id}"
    )
