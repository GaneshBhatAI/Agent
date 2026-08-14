import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # App Info
    APP_NAME: str = "Python GitHub Orchestrator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Database & Storage
    # Defaults to SQLite for immediate zero-dependency testing & dev, PostgreSQL in Docker/Prod
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./orchestrator.db",
        description="Async SQLAlchemy database connection string",
    )
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Redis connection URL for pub/sub (optional, falling back to in-memory)",
    )

    # Security & Auth
    SECRET_KEY: str = Field(
        default="super-secret-production-key-change-this-in-env-file-min-32-chars",
        description="Secret key for JWT and encryption",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    AGENT_TOKEN_SECRET: str = "orchestrator-agent-hmac-secret-key-32chars"
    ENCRYPTION_KEY: Optional[str] = None  # Base64 32-byte key for Fernet

    # GitHub Integration
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    GITHUB_TOKEN: Optional[str] = None  # Default PAT for single-tenant or initial setup

    # Agent Health & Execution
    HEARTBEAT_INTERVAL_SECONDS: int = 15
    HEARTBEAT_TIMEOUT_SECONDS: int = 45  # Mark OFFLINE if no heartbeat in 45s
    JOB_POLL_INTERVAL_SECONDS: int = 3
    DEFAULT_JOB_TIMEOUT_SECONDS: int = 1800  # 30 minutes
    LOG_RETENTION_DAYS: int = 30

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Initial Admin
    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_EMAIL: str = "admin@orchestrator.local"
    INITIAL_ADMIN_PASSWORD: str = "Admin123!"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
