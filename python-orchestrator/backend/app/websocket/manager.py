import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Maps job_id -> set of active WebSockets
        self.job_connections: Dict[str, Set[WebSocket]] = {}
        # Set of WebSockets listening to machines telemetry & dashboard updates
        self.machine_connections: Set[WebSocket] = {}
        # Set of WebSockets listening to global notifications
        self.global_connections: Set[WebSocket] = {}

    async def connect_job(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.job_connections:
            self.job_connections[job_id] = set()
        self.job_connections[job_id].add(websocket)
        logger.debug(f"Client connected to job {job_id} stream. Total: {len(self.job_connections[job_id])}")

    def disconnect_job(self, job_id: str, websocket: WebSocket):
        if job_id in self.job_connections:
            self.job_connections[job_id].discard(websocket)
            if not self.job_connections[job_id]:
                del self.job_connections[job_id]
        logger.debug(f"Client disconnected from job {job_id} stream.")

    async def broadcast_job_log(self, job_id: str, log_entry: dict):
        if job_id in self.job_connections:
            message = json.dumps({"type": "LOG_ENTRY", "data": log_entry})
            stale_sockets = set()
            for connection in self.job_connections[job_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.warning(f"Error broadcasting to job socket: {e}")
                    stale_sockets.add(connection)
            for stale in stale_sockets:
                self.disconnect_job(job_id, stale)

    async def broadcast_job_status(self, job_id: str, status_data: dict):
        # Broadcast to job specific room
        if job_id in self.job_connections:
            message = json.dumps({"type": "STATUS_UPDATE", "data": status_data})
            stale_sockets = set()
            for connection in self.job_connections[job_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    stale_sockets.add(connection)
            for stale in stale_sockets:
                self.disconnect_job(job_id, stale)
        
        # Also broadcast to global dashboard listeners
        await self.broadcast_global("JOB_STATUS_CHANGED", status_data)

    async def connect_machines(self, websocket: WebSocket):
        await websocket.accept()
        self.machine_connections.add(websocket)
        logger.debug(f"Client connected to machines stream. Total: {len(self.machine_connections)}")

    def disconnect_machines(self, websocket: WebSocket):
        self.machine_connections.discard(websocket)
        logger.debug("Client disconnected from machines stream.")

    async def broadcast_machine_update(self, machine_data: dict):
        if self.machine_connections:
            message = json.dumps({"type": "MACHINE_UPDATE", "data": machine_data})
            stale_sockets = set()
            for connection in self.machine_connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    stale_sockets.add(connection)
            for stale in stale_sockets:
                self.disconnect_machines(stale)

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections.discard(websocket)

    async def broadcast_global(self, event_type: str, data: dict):
        if self.global_connections:
            message = json.dumps({"type": event_type, "data": data})
            stale_sockets = set()
            for connection in self.global_connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    stale_sockets.add(connection)
            for stale in stale_sockets:
                self.disconnect_global(stale)


ws_manager = ConnectionManager()
