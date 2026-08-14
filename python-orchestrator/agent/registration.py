import json
import logging
import os
from pathlib import Path
from typing import Optional, Tuple
import httpx

from config import agent_config
from system_info import SystemInfo

logger = logging.getLogger("agent.registration")


class RegistrationManager:
    def __init__(self):
        self.creds_file = Path(agent_config.CREDENTIALS_FILE)

    def load_saved_credentials(self) -> Tuple[Optional[str], Optional[str]]:
        """Load stored machine_id and agent_token if available"""
        if self.creds_file.exists():
            try:
                with open(self.creds_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("machine_id"), data.get("agent_token")
            except Exception as e:
                logger.warning(f"Failed to read credentials file: {e}")
        return agent_config.MACHINE_ID, agent_config.AGENT_TOKEN

    def save_credentials(self, machine_id: str, agent_token: str):
        """Persist credentials securely locally"""
        try:
            with open(self.creds_file, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "machine_id": machine_id,
                        "machine_name": agent_config.MACHINE_NAME,
                        "agent_token": agent_token,
                    },
                    f,
                    indent=2,
                )
            logger.info(f"Saved machine credentials for {machine_id}")
        except Exception as e:
            logger.error(f"Failed to save credentials file: {e}")

    def register(self, central_url: str, token: str) -> Tuple[str, str]:
        """Perform initial handshake with Central Orchestrator Control Room"""
        logger.info(f"Registering machine '{agent_config.MACHINE_NAME}' with {central_url}...")
        metrics = SystemInfo.collect_metrics(agent_config.WORKSPACE_BASE)
        payload = {
            "registration_token": token,
            "machine_name": agent_config.MACHINE_NAME,
            "hostname": metrics["hostname"],
            "ip_address": metrics["ip_address"],
            "operating_system": metrics["operating_system"],
            "python_version": metrics["python_version"],
            "agent_version": agent_config.AGENT_VERSION,
        }

        url = f"{central_url.rstrip('/')}/api/agent/register"
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Machine registration failed [{resp.status_code}]: {resp.text}"
                )
            
            data = resp.json()
            machine_id = data["machine_id"]
            agent_token = data["agent_token"]
            self.save_credentials(machine_id, agent_token)
            logger.info(f"Successfully registered as Machine ID: {machine_id}")
            return machine_id, agent_token


registration_manager = RegistrationManager()
