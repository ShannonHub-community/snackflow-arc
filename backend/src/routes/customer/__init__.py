"""
Combines every route module into a single APIRouter that main.py mounts
once. Adding a new resource means creating routes/<resource>.py and
including it here -- main.py never needs to change (Open/Closed Principle).
"""
from fastapi import APIRouter

from src.routes.customer import menu, orders, payments, store
from src.websocket import router as websocket_module

api_router = APIRouter()
api_router.include_router(store.router)
api_router.include_router(menu.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(websocket_module.router)
