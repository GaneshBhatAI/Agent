import os
import platform
import sys
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    # Central Orchestrator Server
    CENTRAL_URL: str = "http://localhost:8000"
    
    # Machine Configuration
    MACHINE_NAME: str = "Machine-A"
    REGISTRATION_TOKEN: Optional[str] = None
    
    # Auto-saved or configured credentials
    MACHINE_ID: Optional[str] = None
    AGENT_TOKEN: Optional[str] = None
    
    # Execution Paths
    # Windows default C:\PythonOrchestrator or cross-platform fallback
    WORKSPACE_BASE: str = (
        r"C:\PythonOrchestrator" if platform.system() == "Windows" else str(Path.home() / ".python_orchestrator")
    )
    
    # Python executable to use as base for creating venvs
    PYTHON_PATH: str = sys.executable
    
    # Execution options
    KEEP_ENVIRONMENT: bool = True
    CLEANUP_AFTER_JOB: bool = False
    POLL_INTERVAL_SECONDS: int = 3
    HEARTBEAT_INTERVAL_SECONDS: int = 15
    AGENT_VERSION: str = "1.0.0"
    CREDENTIALS_FILE: str = ".agent_credentials.json"

    @property
    def jobs_path(self) -> Path:
        p = Path(self.WORKSPACE_BASE) / "jobs"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def environments_path(self) -> Path:
        p = Path(self.WORKSPACE_BASE) / "environments"
        p.mkdir(parents=True, exist_ok=True)
        return p

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


agent_config = AgentSettings()
