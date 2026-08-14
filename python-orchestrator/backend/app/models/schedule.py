from datetime import datetime
import enum
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, Enum, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, TimestampMixin


class ScheduleType(str, enum.Enum):
    CRON = "CRON"
    INTERVAL = "INTERVAL"
    ONCE = "ONCE"


class Schedule(Base, TimestampMixin):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    
    repository_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    repository_name: Mapped[str] = mapped_column(String(255), nullable=False)
    repository_url: Mapped[str] = mapped_column(String(500), nullable=False)
    branch: Mapped[str] = mapped_column(String(100), default="main", nullable=False)
    entry_point: Mapped[str] = mapped_column(String(255), default="main.py", nullable=False)
    
    machine_id: Mapped[str] = mapped_column(String(64), nullable=False)
    schedule_type: Mapped[ScheduleType] = mapped_column(
        Enum(ScheduleType), default=ScheduleType.CRON, nullable=False
    )
    cron_expression: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    interval_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    parameters: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list, nullable=True)
    environment_variables: Mapped[Optional[Dict[str, str]]] = mapped_column(JSON, default=dict, nullable=True)
    
    next_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_job_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_by: Mapped[str] = mapped_column(String(100), default="admin", nullable=False)
