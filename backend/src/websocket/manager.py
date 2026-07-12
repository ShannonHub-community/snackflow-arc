"""
WebSocket connection manager.

Customers connect to `/ws/orders/{session_uuid}` after scanning the QR
code. We keep an in-memory map of session_uuid -> set of active
WebSocket connections (a customer could have the menu open on two tabs).
Events are pushed only to the connections matching the relevant
session_uuid (or, as a fallback, anyone who explicitly subscribed to a
specific order_id -- e.g. a "track my order" page opened without the
original session context).

NOTE: this in-memory approach works for a single-process deployment. For
multi-worker/horizontal scaling, back this with a Redis pub/sub channel
instead (each worker subscribes and re-broadcasts to its local sockets).
"""
from __future__ import annotations

import uuid
from collections import defaultdict

from fastapi import WebSocket

from src.schemas.websocket import WSEvent
from src.utils.logger import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # session_uuid -> set of live sockets
        self._session_connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        # order_id -> set of live sockets (for direct order-tracking links)
        self._order_connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)

    async def connect_session(self, websocket: WebSocket, session_uuid: uuid.UUID) -> None:
        await websocket.accept()
        self._session_connections[session_uuid].add(websocket)
        logger.info("WebSocket connected for session %s", session_uuid)

    async def connect_order(self, websocket: WebSocket, order_id: uuid.UUID) -> None:
        await websocket.accept()
        self._order_connections[order_id].add(websocket)
        logger.info("WebSocket connected for order %s", order_id)

    def disconnect_session(self, websocket: WebSocket, session_uuid: uuid.UUID) -> None:
        self._session_connections.get(session_uuid, set()).discard(websocket)

    def disconnect_order(self, websocket: WebSocket, order_id: uuid.UUID) -> None:
        self._order_connections.get(order_id, set()).discard(websocket)

    async def notify_session(self, session_uuid: uuid.UUID, event: WSEvent) -> None:
        connections = self._session_connections.get(session_uuid, set())
        await self._broadcast(connections, event)

    async def notify_order(self, order_id: uuid.UUID, event: WSEvent) -> None:
        connections = self._order_connections.get(order_id, set())
        await self._broadcast(connections, event)

    @staticmethod
    async def _broadcast(connections: set[WebSocket], event: WSEvent) -> None:
        if not connections:
            return
        payload = event.model_dump(mode="json")
        dead: list[WebSocket] = []
        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception:  # connection closed / broken pipe etc.
                dead.append(ws)
        for ws in dead:
            connections.discard(ws)


# Process-wide singleton shared by routes and services
manager = ConnectionManager()
