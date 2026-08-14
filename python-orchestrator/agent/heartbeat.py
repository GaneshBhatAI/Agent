import logging
import threading
import time
from typing import Optional
import httpx

from config import agent_config
from system_info import SystemInfo

logger = logging.getLogger("agent.heartbeat")


class HeartbeatService:
    def __init__(self, machine_id: str, agent_token: str, central_url: str):
        self.machine_id = machine_id
        self.agent_token = agent_token
        self.central_url = central_url.rstrip("/")
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def _headers(self) -> dict:
        return {
            "X-Machine-Id": self.machine_id,
            "X-Agent-Token": self.agent_token,
            "Content-Type": "application/json",
        }

    def send_once(self) -> bool:
        """Send a single heartbeat payload"""
        try:
            metrics = SystemInfo.collect_metrics(agent_config.WORKSPACE_BASE)
            payload = {
                "machine_id": self.machine_id,
                "status": "ONLINE",
                "cpu_usage": metrics["cpu_usage"],
                "memory_usage": metrics["memory_usage"],
                "disk_usage": metrics["disk_usage"],
                "python_version": metrics["python_version"],
                "agent_version": agent_config.AGENT_VERSION,
                "hostname": metrics["hostname"],
                "ip_address": metrics["ip_address"],
            }
            url = f"{self.central_url}/api/agent/heartbeat"
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload, headers=self._headers())
                if resp.status_code == 200:
                    logger.debug("Heartbeat beacon acknowledged")
                    return True
                else:
                    logger.warning(f"Heartbeat rejected [{resp.status_code}]: {resp.text}")
                    return False
        except Exception as e:
            logger.warning(f"Failed to send heartbeat to Central Server: {e}")
            return False

    def _loop(self):
        while self._running:
            self.send_once()
            # Sleep in small slices so shutdown is instant
            interval = agent_config.HEARTBEAT_INTERVAL_SECONDS
            for _ in range(int(interval * 2)):
                if not self._running:
                    break
                time.sleep(0.5)

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._loop, name="HeartbeatThread", daemon=True)
            self._thread.start()
            logger.info("Heartbeat service started")

    def stop(self):
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
            logger.info("Heartbeat service stopped")
