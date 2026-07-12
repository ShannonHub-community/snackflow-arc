from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    """
    Manages WebSocket connections, broadcasts, and channel-based messaging.
    """
    
    def __init__(self):
        # Dictionary to store active connections: {channel: [WebSocket]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, channel: str):
        """
        Accept a WebSocket connection and add it to the specified channel.
        """
        await websocket.accept()
        
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        
        self.active_connections[channel].append(websocket)
    
    def disconnect(self, websocket: WebSocket, channel: str):
        """
        Remove a WebSocket connection from the specified channel.
        """
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
            
            # Clean up empty channels
            if not self.active_connections[channel]:
                del self.active_connections[channel]
    
    async def broadcast(self, channel: str, message: dict):
        """
        Broadcast a JSON message to all connections in a specific channel.
        """
        if channel in self.active_connections:
            message_json = json.dumps(message)
            
            # Create a list of connections to iterate (avoid modifying during iteration)
            connections = self.active_connections[channel].copy()
            
            for connection in connections:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    # Remove failed connection
                    self.disconnect(connection, channel)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send a JSON message to a specific WebSocket connection.
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            pass  # Connection may be closed

# Global connection manager instance
manager = ConnectionManager()
