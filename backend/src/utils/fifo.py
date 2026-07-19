import time

# Mock database for orders (to be replaced with Supabase)
mock_orders = [
    {
        "order_id": "A12",
        "status": "Waiting",
        "timestamp": time.time() - 600,  # 10 minutes ago
        "items": [
            {"item_id": "prod_pizza_001", "name": "Pizza", "quantity": 2, "allocated": 0},
            {"item_id": "prod_burger_001", "name": "Burger", "quantity": 1, "allocated": 0}
        ]
    },
    {
        "order_id": "A13",
        "status": "Waiting",
        "timestamp": time.time() - 300,  # 5 minutes ago
        "items": [
            {"item_id": "prod_pizza_001", "name": "Pizza", "quantity": 1, "allocated": 0}
        ]
    },
    {
        "order_id": "A14",
        "status": "Waiting",
        "timestamp": time.time() - 120,  # 2 minutes ago
        "items": [
            {"item_id": "prod_coffee_001", "name": "Coffee", "quantity": 2, "allocated": 0}
        ]
    }
]

def run_fifo_allocation(item_id: str, present_stack: int):
    """
    FIFO Allocation Service:
    - Query for the oldest 'Waiting' order needing this item
    - If stack is sufficient, deduct from the stack
    - If all items in that order are ready, update status to 'Ready_To_Pack'
    
    Args:
        item_id: The ID of the item that was just added to the stack
        present_stack: The current stack count after the update
    
    Returns:
        dict: Allocation result with order_id and status update if applicable
    """
    # Find the oldest 'Waiting' order that needs this item
    oldest_order = None
    oldest_order_index = -1
    
    for i, order in enumerate(mock_orders):
        if order["status"] == "Waiting":
            for order_item in order["items"]:
                if order_item["item_id"] == item_id:
                    # Check if this item still needs allocation
                    needed = order_item["quantity"] - order_item["allocated"]
                    if needed > 0:
                        # This order needs the item
                        if oldest_order is None or order["timestamp"] < oldest_order["timestamp"]:
                            oldest_order = order
                            oldest_order_index = i
                        break
    
    if not oldest_order:
        return {
            "success": False,
            "message": "No waiting orders need this item"
        }
    
    # Find the specific item in the order
    order_item = None
    for item in oldest_order["items"]:
        if item["item_id"] == item_id:
            order_item = item
            break
    
    if not order_item:
        return {
            "success": False,
            "message": "Item not found in order"
        }
    
    # Calculate how much to allocate
    needed = order_item["quantity"] - order_item["allocated"]
    allocated = min(needed, present_stack)
    
    if allocated > 0:
        # Deduct from the stack (mock - in real DB, this would be atomic)
        # present_stack -= allocated  # This would be updated in the calling function
        
        # Update the order item allocation
        order_item["allocated"] += allocated
        
        # Check if all items in the order are now fully allocated
        all_ready = True
        for item in oldest_order["items"]:
            if item["allocated"] < item["quantity"]:
                all_ready = False
                break
        
        # If all items are ready, update order status
        if all_ready:
            old_status = oldest_order["status"]
            oldest_order["status"] = "Ready_To_Pack"
            
            return {
                "success": True,
                "order_id": oldest_order["order_id"],
                "allocated": allocated,
                "old_status": old_status,
                "new_status": "Ready_To_Pack",
                "message": f"Order {oldest_order['order_id']} is now ready to pack"
            }
        
        return {
            "success": True,
            "order_id": oldest_order["order_id"],
            "allocated": allocated,
            "message": f"Allocated {allocated} units to order {oldest_order['order_id']}"
        }
    
    return {
        "success": False,
        "message": "Insufficient stack to allocate to oldest order"
    }
