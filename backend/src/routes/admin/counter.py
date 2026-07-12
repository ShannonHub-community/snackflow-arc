from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import time

from src.middleware.admin_security import verify_counter_role
from src.sockets.connection import manager as websocket_manager
from src.utils.fifo import run_fifo_allocation

router = APIRouter(prefix="/api/counter", tags=["counter"])

# Mock database for orders
mock_orders = [
    {
        "order_id": "A12",
        "customer_name": "John Doe",
        "status": "Ready_To_Pack",
        "total_amount": 250,
        "payment_method": "cash",
        "created_at": time.time() - 600,
        "updated_at": time.time() - 300,
        "items": [
            {"item_id": "prod_dosa_001", "name": "Masala Dosa", "quantity": 2},
            {"item_id": "prod_beverage_001", "name": "Coke", "quantity": 1}
        ]
    },
    {
        "order_id": "A13",
        "customer_name": "Jane Smith",
        "status": "Waiting",
        "total_amount": 150,
        "payment_method": "online",
        "created_at": time.time() - 400,
        "updated_at": time.time() - 200,
        "items": [
            {"item_id": "prod_dosa_002", "name": "Plain Dosa", "quantity": 1}
        ]
    },
    {
        "order_id": "A14",
        "customer_name": "Bob Johnson",
        "status": "Waiting",
        "total_amount": 300,
        "payment_method": "cash",
        "created_at": time.time() - 300,
        "updated_at": time.time() - 100,
        "items": [
            {"item_id": "prod_snack_001", "name": "Samosa", "quantity": 2},
            {"item_id": "prod_beverage_001", "name": "Coke", "quantity": 2}
        ]
    },
    {
        "order_id": "A15",
        "customer_name": "Alice Brown",
        "status": "Delivered",
        "total_amount": 200,
        "payment_method": "online",
        "created_at": time.time() - 7200,  # 2 hours ago
        "updated_at": time.time() - 3600,  # 1 hour ago
        "items": [
            {"item_id": "prod_main_001", "name": "Paneer Tikka", "quantity": 1}
        ]
    },
    {
        "order_id": "A16",
        "customer_name": "Charlie Davis",
        "status": "Delivered",
        "total_amount": 180,
        "payment_method": "cash",
        "created_at": time.time() - 10800,  # 3 hours ago
        "updated_at": time.time() - 7200,  # 2 hours ago
        "items": [
            {"item_id": "prod_dosa_001", "name": "Masala Dosa", "quantity": 1}
        ]
    }
]

# Mock Expected_App_Cash for manager
mock_expected_cash = 4500

# Mock Refund_Queue
mock_refund_queue = []

class OrderItem(BaseModel):
    item_id: str
    name: str
    quantity: int

class Order(BaseModel):
    order_id: str
    customer_name: str
    status: str
    total_amount: float
    payment_method: str
    created_at: float
    updated_at: float
    items: List[OrderItem]

class ActiveOrdersResponse(BaseModel):
    success: bool
    orders: List[Order]
    message: str

class HistoryOrdersResponse(BaseModel):
    success: bool
    orders: List[Order]
    message: str

class CompleteOrderResponse(BaseModel):
    success: bool
    order_id: str
    new_status: str
    message: str

class CancelOrderResponse(BaseModel):
    success: bool
    order_id: str
    new_status: str
    refund_queued: Optional[bool] = None
    message: str

@router.get("/orders/active", response_model=ActiveOrdersResponse)
async def get_active_orders(user: dict = Depends(verify_counter_role)):
    """
    Get active orders where status is 'Waiting' or 'Ready_To_Pack'.
    Sorts orders so 'Ready_To_Pack' orders are always at index 0 (top of list).
    Requires counter/manager/owner role authentication.
    """
    # Filter for active orders (Waiting or Ready_To_Pack)
    active_orders = [
        Order(**order)
        for order in mock_orders
        if order["status"] in ["Waiting", "Ready_To_Pack"]
    ]
    
    # Sort so Ready_To_Pack orders are at the top
    active_orders.sort(key=lambda x: 0 if x.status == "Ready_To_Pack" else 1)
    
    return ActiveOrdersResponse(
        success=True,
        orders=active_orders,
        message=f"Found {len(active_orders)} active orders"
    )

@router.get("/orders/history", response_model=HistoryOrdersResponse)
async def get_order_history(user: dict = Depends(verify_counter_role)):
    """
    Get order history where status is 'Delivered' and updated_at is within last 3 hours.
    Limited to 50 items.
    Requires counter/manager/owner role authentication.
    """
    current_time = time.time()
    three_hours_ago = current_time - (3 * 60 * 60)  # 3 hours in seconds
    
    # Filter for delivered orders within last 3 hours
    history_orders = [
        Order(**order)
        for order in mock_orders
        if order["status"] == "Delivered" and order["updated_at"] >= three_hours_ago
    ]
    
    # Limit to 50 items
    history_orders = history_orders[:50]
    
    return HistoryOrdersResponse(
        success=True,
        orders=history_orders,
        message=f"Found {len(history_orders)} orders in history (last 3 hours)"
    )

@router.post("/orders/{order_id}/complete", response_model=CompleteOrderResponse)
async def complete_order(
    order_id: str,
    user: dict = Depends(verify_counter_role)
):
    """
    Complete an order by updating status to 'Delivered'.
    If payment is 'cash', adds amount to manager's Expected_App_Cash.
    Broadcasts 'order_completed' event to customer channel via WebSocket.
    Requires counter/manager/owner role authentication.
    """
    # Find the order in mock database
    order = None
    for mock_order in mock_orders:
        if mock_order["order_id"] == order_id:
            order = mock_order
            break
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Update status to 'Delivered'
    old_status = order["status"]
    order["status"] = "Delivered"
    order["updated_at"] = time.time()
    
    # If payment is cash, add to Expected_App_Cash
    if order["payment_method"] == "cash":
        global mock_expected_cash
        mock_expected_cash += order["total_amount"]
    
    # Broadcast order_completed event to customer channel
    await websocket_manager.broadcast("customer_channel", {
        "event": "order_completed",
        "order_id": order_id,
        "customer_name": order["customer_name"],
        "total_amount": order["total_amount"],
        "payment_method": order["payment_method"],
        "timestamp": time.time()
    })
    
    return CompleteOrderResponse(
        success=True,
        order_id=order_id,
        new_status="Delivered",
        message=f"Order {order_id} marked as delivered" + 
                (f". Cash amount {order['total_amount']} added to Expected_App_Cash" if order["payment_method"] == "cash" else "")
    )

@router.post("/orders/{order_id}/cancel", response_model=CancelOrderResponse)
async def cancel_order(
    order_id: str,
    user: dict = Depends(verify_counter_role)
):
    """
    Cancel an order (Restock Engine).
    Checks order status and payment method.
    - If payment was 'online', pushes to Refund_Queue.
    - If order was 'Ready_To_Pack', uses atomic SQL update to return items to stack and calls run_fifo_allocation().
    - If order was 'Waiting', uses atomic SQL update to reduce total_ordered and emits WebSocket update to KDS.
    Requires counter/manager/owner role authentication.
    """
    # Find the order in mock database
    order = None
    for mock_order in mock_orders:
        if mock_order["order_id"] == order_id:
            order = mock_order
            break
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    old_status = order["status"]
    payment_method = order["payment_method"]
    refund_queued = False
    
    # If payment was online, push to Refund_Queue
    if payment_method == "online":
        mock_refund_queue.append({
            "order_id": order_id,
            "amount": order["total_amount"],
            "customer_name": order["customer_name"],
            "timestamp": time.time()
        })
        refund_queued = True
    
    # Handle restocking based on order status
    if old_status == "Ready_To_Pack":
        # Order was ready to pack - items need to be returned to stack
        # CRITICAL: In actual database implementation, this MUST use an atomic SQL update
        # to prevent race conditions. Example SQL:
        # UPDATE inventory SET present_stack = present_stack + :qty WHERE item_id = :item_id
        for item in order["items"]:
            # Mock: In real DB, execute atomic increment for each item
            pass
        
        # Immediately call run_fifo_allocation to reallocate returned items
        for item in order["items"]:
            run_fifo_allocation(item["item_id"], 0)  # Stack would be updated atomically above
        
    elif old_status == "Waiting":
        # Order was still being prepared - reduce total_ordered
        # CRITICAL: In actual database implementation, this MUST use an atomic SQL update
        # to prevent race conditions. Example SQL:
        # UPDATE inventory SET total_ordered = total_ordered - :qty WHERE item_id = :item_id
        for item in order["items"]:
            # Mock: In real DB, execute atomic decrement for each item
            pass
        
        # Emit WebSocket update to KDS so they stop cooking this order
        await websocket_manager.broadcast("kitchen_station", {
            "event": "order_cancelled",
            "order_id": order_id,
            "items": [{"item_id": item["item_id"], "name": item["name"], "quantity": item["quantity"]} for item in order["items"]],
            "timestamp": time.time()
        })
    
    # Update order status to 'Cancelled'
    order["status"] = "Cancelled"
    order["updated_at"] = time.time()
    
    return CancelOrderResponse(
        success=True,
        order_id=order_id,
        new_status="Cancelled",
        refund_queued=refund_queued,
        message=f"Order {order_id} cancelled. Status was {old_status}, payment was {payment_method}" +
                (". Refund queued for processing." if refund_queued else "")
    )
