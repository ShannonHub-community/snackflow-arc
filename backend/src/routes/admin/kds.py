from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional
import time

from src.middleware.admin_security import verify_kitchen_role
from src.sockets.connection import manager as websocket_manager
from src.utils.fifo import run_fifo_allocation

router = APIRouter(prefix="/api/kds", tags=["kds"])

# Global station heartbeat dictionary for fallback routing
STATION_HEARTBEATS = {
    "Dosa Station": time.time(),
    "Fryer": time.time() - 50,  # Mock: Fryer is offline (older than 45 seconds)
    "Beverage Station": time.time(),
    "Grill Station": time.time()
}

# Mock database for station assignments and dish inventory
mock_station_inventory = {
    "Dosa Station": [
        {
            "item_id": "prod_dosa_001",
            "name": "Masala Dosa",
            "total_ordered": 5,
            "present_stack": 2
        },
        {
            "item_id": "prod_dosa_002",
            "name": "Plain Dosa",
            "total_ordered": 3,
            "present_stack": 1
        }
    ],
    "Fryer": [
        {
            "item_id": "prod_snack_001",
            "name": "Samosa",
            "total_ordered": 8,
            "present_stack": 4
        },
        {
            "item_id": "prod_snack_002",
            "name": "Vada",
            "total_ordered": 6,
            "present_stack": 3
        }
    ],
    "Beverage Station": [
        {
            "item_id": "prod_beverage_001",
            "name": "Coke",
            "total_ordered": 10,
            "present_stack": 5
        }
    ],
    "Grill Station": [
        {
            "item_id": "prod_main_001",
            "name": "Paneer Tikka",
            "total_ordered": 4,
            "present_stack": 2
        }
    ]
}

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
    quantity_made: int  # Can be negative for corrections

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

@router.get("/station-state", response_model=StationStateResponse)
async def get_station_state(user: dict = Depends(verify_kitchen_role)):
    """
    Get station state with assigned dishes and need counts.
    Implements fallback routing if Fryer station is offline.
    Requires kitchen/manager/owner role authentication.
    """
    # Extract station from JWT (mock - in real implementation, station would be in token)
    station = user.get("station", "Dosa Station")
    
    # Get dishes assigned to the user's station
    station_dishes = mock_station_inventory.get(station, [])
    
    # Calculate need_count for each dish
    dishes_with_need = []
    for dish in station_dishes:
        need_count = dish["total_ordered"] - dish["present_stack"]
        dishes_with_need.append(DishItem(
            item_id=dish["item_id"],
            name=dish["name"],
            total_ordered=dish["total_ordered"],
            present_stack=dish["present_stack"],
            need_count=need_count
        ))
    
    # Fallback routing: Check if Fryer station is offline
    fallback_items = None
    current_time = time.time()
    fryer_heartbeat = STATION_HEARTBEATS.get("Fryer", 0)
    
    # If Fryer is offline (heartbeat older than 45 seconds), bundle Fryer items
    if current_time - fryer_heartbeat > 45:
        fryer_dishes = mock_station_inventory.get("Fryer", [])
        fallback_items = []
        for dish in fryer_dishes:
            need_count = dish["total_ordered"] - dish["present_stack"]
            fallback_items.append(DishItem(
                item_id=dish["item_id"],
                name=dish["name"],
                total_ordered=dish["total_ordered"],
                present_stack=dish["present_stack"],
                need_count=need_count
            ))
    
    return StationStateResponse(
        station=station,
        dishes=dishes_with_need,
        fallback_items=fallback_items,
        message=f"Station state retrieved for {station}" + (" with Fryer fallback" if fallback_items else "")
    )

@router.post("/action/update-stack", response_model=UpdateStackResponse)
async def update_stack(
    request: UpdateStackRequest,
    user: dict = Depends(verify_kitchen_role)
):
    """
    Update the present_stack count for a dish.
    Accepts item_id and quantity_made (can be negative for corrections).
    
    CRITICAL: In actual database implementation, this MUST use an atomic increment
    to prevent race conditions. Example SQL:
    UPDATE inventory SET present_stack = present_stack + :qty WHERE item_id = :item_id
    
    Triggers FIFO allocation and broadcasts demand update via WebSocket.
    Requires kitchen/manager/owner role authentication.
    """
    # Mock database update
    # In real implementation: execute atomic increment query
    
    # Find the item in mock database and update
    updated = False
    new_present_stack = 0
    
    for station_dishes in mock_station_inventory.values():
        for dish in station_dishes:
            if dish["item_id"] == request.item_id:
                # Update present_stack (mock - not atomic)
                dish["present_stack"] += request.quantity_made
                new_present_stack = dish["present_stack"]
                updated = True
                break
        if updated:
            break
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    # Trigger FIFO allocation immediately after stack update
    allocation_result = run_fifo_allocation(request.item_id, new_present_stack)
    
    # Broadcast demand_updated event via WebSocket to kitchen tablets
    # Calculate new need counts for all dishes at this station
    station = user.get("station", "Dosa Station")
    station_dishes = mock_station_inventory.get(station, [])
    
    demand_update = {
        "event": "demand_updated",
        "station": station,
        "timestamp": time.time(),
        "dishes": []
    }
    
    for dish in station_dishes:
        need_count = dish["total_ordered"] - dish["present_stack"]
        demand_update["dishes"].append({
            "item_id": dish["item_id"],
            "name": dish["name"],
            "need_count": need_count
        })
    
    # Broadcast to kitchen_station channel
    await websocket_manager.broadcast("kitchen_station", demand_update)
    
    return UpdateStackResponse(
        success=True,
        item_id=request.item_id,
        new_present_stack=new_present_stack,
        message=f"Stack updated by {request.quantity_made} for item {request.item_id}",
        allocation_result=allocation_result
    )

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
