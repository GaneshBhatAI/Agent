from datetime import datetime
import enum
from typing import Optional
from sqlalchemy import DateTime, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, TimestampMixin


class MachineStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    BUSY = "BUSY"
    DISABLED = "DISABLED"


class Machine(Base, TimestampMixin):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    machine_name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    machine_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    hostname: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    operating_system: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    python_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    agent_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[MachineStatus] = mapped_column(
        Enum(MachineStatus), default=MachineStatus.OFFLINE, nullable=False, index=True
    )
    last_heartbeat: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cpu_usage: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    memory_usage: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    disk_usage: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    
    # Registration & Auth
    registration_token: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True)
    agent_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_job_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
