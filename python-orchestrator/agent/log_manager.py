from datetime import datetime, timezone
import logging
import queue
import re
import threading
import time
from typing import Dict, List, Optional
import httpx

logger = logging.getLogger("agent.logs")

# Sensitive tokens / password mask patterns
SECRET_PATTERNS = [
    re.compile(r"(?i)(password|secret|token|api[_-]?key|access[_-]?token)[\s:=]+([^\s,;]+)"),
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
    re.compile(r"gho_[a-zA-Z0-9]{36}"),
]


class LogManager:
    def __init__(self, central_url: str, machine_id: str, agent_token: str, job_id: str):
        self.central_url = central_url.rstrip("/")
        self.machine_id = machine_id
        self.agent_token = agent_token
        self.job_id = job_id
        self.queue: queue.Queue = queue.Queue()
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def _mask_secrets(self, text: str) -> str:
        masked = text
        for pattern in SECRET_PATTERNS:
            masked = pattern.sub(r"\1: [REDACTED]", masked)
        return masked

    def log(self, message: str, level: str = "INFO"):
        clean_msg = self._mask_secrets(message)
        entry = {
            "level": level.upper(),
            "message": clean_msg,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.queue.put(entry)

    def _flush_batch(self, batch: List[Dict]):
        if not batch:
            return
        url = f"{self.central_url}/api/agent/jobs/{self.job_id}/logs"
        headers = {
            "X-Machine-Id": self.machine_id,
            "X-Agent-Token": self.agent_token,
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(url, json={"logs": batch}, headers=headers)
                if resp.status_code != 200:
                    logger.warning(f"Failed to post logs to server [{resp.status_code}]")
        except Exception as e:
            logger.warning(f"Failed to stream logs to Central Server: {e}")

    def _loop(self):
        while self._running or not self.queue.empty():
            batch = []
            while len(batch) < 50:
                try:
                    entry = self.queue.get_nowait()
                    batch.append(entry)
                    self.queue.task_done()
                except queue.Empty:
                    break

            if batch:
                self._flush_batch(batch)
            time.sleep(0.25)

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._loop, name=f"LogStreamer-{self.job_id}", daemon=True)
            self._thread.start()

    def stop(self):
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        # Flush any remaining items in queue
        remaining = []
        while not self.queue.empty():
            try:
                remaining.append(self.queue.get_nowait())
                self.queue.task_done()
            except queue.Empty:
                break
        if remaining:
            self._flush_batch(remaining)
