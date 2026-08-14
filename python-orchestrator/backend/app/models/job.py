from datetime import datetime
import enum
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Enum, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, TimestampMixin


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    ASSIGNED = "ASSIGNED"
    PREPARING = "PREPARING"
    INSTALLING_DEPENDENCIES = "INSTALLING_DEPENDENCIES"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"


class ErrorType(str, enum.Enum):
    NONE = "NONE"
    INFRASTRUCTURE_ERROR = "INFRASTRUCTURE_ERROR"
    APPLICATION_ERROR = "APPLICATION_ERROR"


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    
    repository_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repository_name: Mapped[str] = mapped_column(String(255), nullable=False)
    repository_url: Mapped[str] = mapped_column(String(500), nullable=False)
    branch: Mapped[str] = mapped_column(String(100), default="main", nullable=False)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    entry_point: Mapped[str] = mapped_column(String(255), default="main.py", nullable=False)
    
    machine_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus), default=JobStatus.QUEUED, index=True, nullable=False
    )
    
    parameters: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list, nullable=True)
    environment_variables: Mapped[Optional[Dict[str, str]]] = mapped_column(JSON, default=dict, nullable=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_type: Mapped[ErrorType] = mapped_column(Enum(ErrorType), default=ErrorType.NONE, nullable=False)
    
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=1800, nullable=False)
    
    created_by: Mapped[str] = mapped_column(String(100), default="admin", nullable=False)
    schedule_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
