from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional
import time

from src.middleware.admin_security import verify_kitchen_role
from src.sockets.connection import manager as websocket_manager
from src.utils.fifo import run_fifo_allocation

router = APIRouter(tags=["kds"])

# Global station heartbeat dictionary for fallback routing
STATION_HEARTBEATS = {
    "Beverage Station": time.time(),
    "Grill Station": time.time(),
    "Oven Station": time.time()
}

# Mock database for station assignments and dish inventory (6 Allowed Western Items)
mock_station_inventory = {
    "Beverage Station": [
        {
            "item_id": "prod_tea_001",
            "name": "Tea",
            "total_ordered": 10,
            "present_stack": 4
        },
        {
            "item_id": "prod_coffee_001",
            "name": "Coffee",
            "total_ordered": 8,
            "present_stack": 3
        }
    ],
    "Grill Station": [
        {
            "item_id": "prod_burger_001",
            "name": "Burger",
            "total_ordered": 6,
            "present_stack": 2
        },
        {
            "item_id": "prod_sandwich_001",
            "name": "Sandwich",
            "total_ordered": 5,
            "present_stack": 2
        }
    ],
    "Oven Station": [
        {
            "item_id": "prod_pizza_001",
            "name": "Pizza",
            "total_ordered": 7,
            "present_stack": 1
        },
        {
            "item_id": "prod_pasta_001",
            "name": "Pasta",
            "total_ordered": 4,
            "present_stack": 1
        }
    ]
}

def record_customer_order_demand(items: list):
    """
    Increments total_ordered volume in station inventory when a customer submits an order.
    """
    for item in items:
        item_id = str(item.get("menu_item_id") or item.get("id") or item.get("item_id") or "")
        qty = int(item.get("quantity", 1))
        
        found = False
        for st_name, station_dishes in mock_station_inventory.items():
            for dish in station_dishes:
                if dish["item_id"] == item_id or dish["name"].lower() in str(item).lower():
                    dish["total_ordered"] += qty
                    found = True
                    break
            if found:
                break

class DishItem(BaseModel):
    item_id: str
    name: str
    total_ordered: int
    present_stack: int
    need_count: int

class StationStateResponse(BaseModel):
    station: str
    dishes: List[DishItem]
    fallback_items: Optional[List[DishItem]] = None
    message: str

class UpdateStackRequest(BaseModel):
    item_id: str
    quantity_made: int  # Can be negative for corrections; if -999, clears total need
    station_id: Optional[str] = None
    clear_need: Optional[bool] = False

class UpdateStackResponse(BaseModel):
    success: bool
    item_id: str
    new_present_stack: int
    message: str
    allocation_result: Optional[dict] = None

class HeartbeatRequest(BaseModel):
    station_id: str

class HeartbeatResponse(BaseModel):
    success: bool
    station_id: str
    message: str

def _build_station_response(station_id: str) -> StationStateResponse:
    dishes_with_need = []
    
    if station_id == "all" or not station_id:
        # Aggregate all dishes from all stations
        for st_name, dishes in mock_station_inventory.items():
            for dish in dishes:
                need_count = max(0, dish["total_ordered"] - dish["present_stack"])
                dishes_with_need.append(DishItem(
                    item_id=dish["item_id"],
                    name=dish["name"],
                    total_ordered=dish["total_ordered"],
                    present_stack=dish["present_stack"],
                    need_count=need_count
                ))
    else:
        station_dishes = mock_station_inventory.get(station_id, [])
        for dish in station_dishes:
            need_count = max(0, dish["total_ordered"] - dish["present_stack"])
            dishes_with_need.append(DishItem(
                item_id=dish["item_id"],
                name=dish["name"],
                total_ordered=dish["total_ordered"],
                present_stack=dish["present_stack"],
                need_count=need_count
            ))

    # Fallback routing check (e.g., if Fryer station is offline)
    fallback_items = None
    current_time = time.time()
    fryer_heartbeat = STATION_HEARTBEATS.get("Fryer", 0)
    if current_time - fryer_heartbeat > 45 and station_id != "Fryer":
        fryer_dishes = mock_station_inventory.get("Fryer", [])
        fallback_items = []
        for dish in fryer_dishes:
            need_count = max(0, dish["total_ordered"] - dish["present_stack"])
            fallback_items.append(DishItem(
                item_id=dish["item_id"],
                name=dish["name"],
                total_ordered=dish["total_ordered"],
                present_stack=dish["present_stack"],
                need_count=need_count
            ))

    return StationStateResponse(
        station=station_id,
        dishes=dishes_with_need,
        fallback_items=fallback_items,
        message=f"Station state retrieved for {station_id}" + (" with Fryer fallback" if fallback_items else "")
    )

@router.get("/station-state/{station_id}", response_model=StationStateResponse)
async def get_station_state_by_id(station_id: str, user: dict = Depends(verify_kitchen_role)):
    """
    Get aggregated station state for a specific station (e.g., 'Beverage Station', 'Grill Station', 'Oven Station', or 'all').
    Returns dish list with calculated need_count: max(0, total_ordered - present_stack).
    """
    return _build_station_response(station_id)

@router.get("/station-state", response_model=StationStateResponse)
async def get_station_state(user: dict = Depends(verify_kitchen_role)):
    """
    Get station state for the logged-in kitchen role station.
    """
    station = user.get("station", "Beverage Station")
    return _build_station_response(station)

async def _process_fulfillment(request: UpdateStackRequest, user: dict):
    updated = False
    new_present_stack = 0
    
    for station_dishes in mock_station_inventory.values():
        for dish in station_dishes:
            if dish["item_id"] == request.item_id:
                if request.clear_need or request.quantity_made == -999:
                    dish["present_stack"] = dish["total_ordered"]
                else:
                    dish["present_stack"] = max(0, dish["present_stack"] + request.quantity_made)
                new_present_stack = dish["present_stack"]
                updated = True
                break
        if updated:
            break
    
    if not updated:
        # Dynamically add custom item if not in mock inventory
        new_present_stack = max(0, request.quantity_made)
    
    # Run FIFO allocation
    allocation_result = run_fifo_allocation(request.item_id, new_present_stack)
    
    # Broadcast demand_updated WebSocket event
    station = request.station_id or user.get("station", "Beverage Station")
    demand_update = {
        "event": "demand_updated",
        "station": station,
        "item_id": request.item_id,
        "timestamp": time.time(),
    }
    await websocket_manager.broadcast("kitchen_station", demand_update)
    
    return UpdateStackResponse(
        success=True,
        item_id=request.item_id,
        new_present_stack=new_present_stack,
        message=f"Fulfillment updated by {request.quantity_made} for item {request.item_id}",
        allocation_result=allocation_result
    )

@router.post("/fulfill", response_model=UpdateStackResponse)
async def fulfill_batch(
    request: UpdateStackRequest,
    user: dict = Depends(verify_kitchen_role)
):
    """
    Batch Fulfillment Endpoint (POST /api/kds/fulfill).
    Accepts quantity_made (+1, +2, +5, -1, or clear_need).
    Triggers FIFO allocation and broadcasts WebSocket demand update.
    """
    return await _process_fulfillment(request, user)

@router.post("/action/update-stack", response_model=UpdateStackResponse)
async def update_stack(
    request: UpdateStackRequest,
    user: dict = Depends(verify_kitchen_role)
):
    """
    Legacy Action Endpoint for updating stack count.
    """
    return await _process_fulfillment(request, user)

@router.post("/heartbeat", response_model=HeartbeatResponse)
async def station_heartbeat(
    request: HeartbeatRequest,
    user: dict = Depends(verify_kitchen_role)
):
    """
    Update the station heartbeat timestamp to track connectivity.
    Accepts station_id and updates the global STATION_HEARTBEATS dictionary.
    Requires kitchen/manager/owner role authentication.
    """
    # Update the global heartbeat dictionary with current timestamp
    STATION_HEARTBEATS[request.station_id] = time.time()
    
    return HeartbeatResponse(
        success=True,
        station_id=request.station_id,
        message=f"Heartbeat recorded for {request.station_id}"
    )

@router.websocket("/ws/kitchen-station")
async def websocket_kitchen_station(websocket: WebSocket, station: str):
    """
    WebSocket endpoint for kitchen station connections.
    Accepts station parameter and maintains connection for real-time updates.
    """
    await websocket_manager.connect(websocket, "kitchen_station")
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "event": "connected",
            "station": station,
            "message": f"Connected to kitchen station channel for {station}"
        })
        
        # Keep connection alive and listen for messages
        while True:
            data = await websocket.receive_json()
            # Echo back or process client messages if needed
            await websocket.send_json({
                "event": "echo",
                "data": data
            })
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, "kitchen_station")
    except Exception as e:
        websocket_manager.disconnect(websocket, "kitchen_station")
