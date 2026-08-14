import argparse
import logging
import os
import signal
import sys
import time
import httpx

from config import agent_config
from executor import JobExecutor
from heartbeat import HeartbeatService
from registration import registration_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] (%(name)s): %(message)s",
)
logger = logging.getLogger("orchestrator.agent")


class MachineAgent:
    def __init__(self, central_url: str, machine_name: str, registration_token: str = None):
        self.central_url = central_url.rstrip("/")
        self.machine_name = machine_name
        self.registration_token = registration_token
        self.machine_id = None
        self.agent_token = None
        self.heartbeat_service = None
        self.current_executor = None
        self._running = False

    def initialize(self):
        """Load credentials or perform registration handshake"""
        machine_id, agent_token = registration_manager.load_saved_credentials()

        if not machine_id or not agent_token:
            token = self.registration_token or agent_config.REGISTRATION_TOKEN
            if not token:
                logger.error("No registration token provided and no saved credentials found.")
                logger.error("Please run with --token <REGISTRATION_TOKEN> or set REGISTRATION_TOKEN environment variable.")
                sys.exit(1)

            machine_id, agent_token = registration_manager.register(
                central_url=self.central_url,
                token=token,
            )

        self.machine_id = machine_id
        self.agent_token = agent_token
        logger.info(f"Initialized Agent for Machine '{self.machine_name}' (ID: {self.machine_id})")

    def _headers(self) -> dict:
        return {
            "X-Machine-Id": self.machine_id,
            "X-Agent-Token": self.agent_token,
            "Content-Type": "application/json",
        }

    def poll_for_job(self) -> dict | None:
        """Poll Central Orchestrator for pending assigned jobs"""
        url = f"{self.central_url}/api/agent/jobs"
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, headers=self._headers())
                if resp.status_code == 200 and resp.text:
                    return resp.json()
                elif resp.status_code == 204:
                    return None
                elif resp.status_code in (401, 403):
                    logger.error(f"Authentication error with Central Orchestrator [{resp.status_code}]: {resp.text}")
                    return None
                else:
                    logger.warning(f"Unexpected response while polling [{resp.status_code}]: {resp.text}")
                    return None
        except Exception as e:
            logger.warning(f"Connection error polling Central Orchestrator ({self.central_url}): {e}")
            return None

    def run(self):
        self.initialize()
        self._running = True

        # Start background heartbeat service
        self.heartbeat_service = HeartbeatService(
            machine_id=self.machine_id,
            agent_token=self.agent_token,
            central_url=self.central_url,
        )
        self.heartbeat_service.start()

        logger.info("=" * 60)
        logger.info(f"  Machine Agent is ONLINE and ready for jobs.")
        logger.info(f"  Central Server: {self.central_url}")
        logger.info(f"  Machine ID:     {self.machine_id}")
        logger.info(f"  Workspace Base: {agent_config.WORKSPACE_BASE}")
        logger.info("=" * 60)

        try:
            while self._running:
                job_dispatch = self.poll_for_job()
                if job_dispatch:
                    logger.info(f"Received job dispatch: {job_dispatch.get('job_id')}")
                    self.current_executor = JobExecutor(
                        central_url=self.central_url,
                        machine_id=self.machine_id,
                        agent_token=self.agent_token,
                    )
                    self.current_executor.execute_job(job_dispatch)
                    self.current_executor = None
                else:
                    time.sleep(agent_config.POLL_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            logger.info("Interrupt received, stopping agent...")
        finally:
            self.shutdown()

    def shutdown(self):
        self._running = False
        if self.heartbeat_service:
            self.heartbeat_service.stop()
        logger.info("Machine Agent stopped.")


def main():
    parser = argparse.ArgumentParser(description="Python GitHub Orchestrator Machine Agent")
    parser.add_argument("--central-url", default=agent_config.CENTRAL_URL, help="Central Orchestrator URL")
    parser.add_argument("--machine-name", default=agent_config.MACHINE_NAME, help="Machine Name")
    parser.add_argument("--token", default=agent_config.REGISTRATION_TOKEN, help="Registration Token")
    args = parser.parse_args()

    agent = MachineAgent(
        central_url=args.central_url,
        machine_name=args.machine_name,
        registration_token=args.token,
    )

    def sig_handler(signum, frame):
        logger.info("Termination signal received.")
        agent.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, sig_handler)

    agent.run()


if __name__ == "__main__":
    main()
