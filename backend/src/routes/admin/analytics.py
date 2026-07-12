from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Any

from src.middleware.admin_security import verify_manager_role

router = APIRouter(prefix="/api/owner/analytics", tags=["analytics"])

class TopItem(BaseModel):
    item_id: str
    name: str
    quantity_sold: int
    revenue: float

class HeatmapData(BaseModel):
    hour: int
    order_count: int

class DashboardResponse(BaseModel):
    date: str
    total_revenue: float
    total_orders: int
    top_items: List[TopItem]
    traffic_heatmap: List[HeatmapData]
    avg_fulfillment_time_minutes: float
    peak_hour: int

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_analytics(user: dict = Depends(verify_manager_role)):
    """
    Get daily analytics dashboard data.
    Returns mock static data representing Daily_Summaries table fetch.
    Includes top 5 items, revenue, traffic heatmap, and avg fulfillment time.
    Requires admin role authentication.
    """
    # Mock static data representing a Daily_Summaries table fetch
    mock_dashboard_data = {
        "date": "2026-07-05",
        "total_revenue": 15250.50,
        "total_orders": 87,
        "top_items": [
            {
                "item_id": "prod_dosa_001",
                "name": "Masala Dosa",
                "quantity_sold": 25,
                "revenue": 2000.0
            },
            {
                "item_id": "prod_beverage_002",
                "name": "Coke",
                "quantity_sold": 40,
                "revenue": 1200.0
            },
            {
                "item_id": "prod_snack_003",
                "name": "Samosa",
                "quantity_sold": 35,
                "revenue": 1050.0
            },
            {
                "item_id": "prod_main_004",
                "name": "Thali",
                "quantity_sold": 15,
                "revenue": 4500.0
            },
            {
                "item_id": "prod_dessert_005",
                "name": "Gulab Jamun",
                "quantity_sold": 20,
                "revenue": 800.0
            }
        ],
        "traffic_heatmap": [
            {"hour": 9, "order_count": 5},
            {"hour": 10, "order_count": 12},
            {"hour": 11, "order_count": 18},
            {"hour": 12, "order_count": 25},
            {"hour": 13, "order_count": 22},
            {"hour": 14, "order_count": 15},
            {"hour": 15, "order_count": 10},
            {"hour": 16, "order_count": 8},
            {"hour": 17, "order_count": 12},
            {"hour": 18, "order_count": 20},
            {"hour": 19, "order_count": 18},
            {"hour": 20, "order_count": 14},
            {"hour": 21, "order_count": 8},
            {"hour": 22, "order_count": 4}
        ],
        "avg_fulfillment_time_minutes": 12.5,
        "peak_hour": 12
    }
    
    return DashboardResponse(**mock_dashboard_data)
