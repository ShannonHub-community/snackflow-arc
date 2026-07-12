"""
WebSocket routes for real-time order tracking.

Two connection modes are supported:
  - /ws/session/{session_uuid}  -> receives events for ALL orders placed
    under that session (typical case: customer keeps the menu page open).
  - /ws/order/{order_id}        -> receives events for a single order only
    (typical case: a shared "track my order" link).

Both are read-mostly channels from the server's perspective; we still
consume incoming messages (e.g. ping/pong) so the connection doesn't
appear dead to the ASGI server.
"""
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.utils.logger import get_logger
from src.websocket.manager import manager

router = APIRouter(tags=["WebSocket"])
logger = get_logger(__name__)


@router.websocket("/ws/session/{session_uuid}")
async def websocket_session_endpoint(websocket: WebSocket, session_uuid: uuid.UUID):
    await manager.connect_session(websocket, session_uuid)
    try:
        while True:
            # We don't require the client to send anything, but reading
            # keeps the receive loop alive and detects disconnects promptly.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_session(websocket, session_uuid)
        logger.info("WebSocket disconnected for session %s", session_uuid)


@router.websocket("/ws/order/{order_id}")
async def websocket_order_endpoint(websocket: WebSocket, order_id: uuid.UUID):
    await manager.connect_order(websocket, order_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_order(websocket, order_id)
        logger.info("WebSocket disconnected for order %s", order_id)
