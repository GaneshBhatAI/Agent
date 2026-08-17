from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.machine import MachineStatus


class MachineBase(BaseModel):
    machine_name: str
    hostname: Optional[str] = None
    operating_system: Optional[str] = None
    python_version: Optional[str] = None
    agent_version: Optional[str] = None


class MachineCreate(BaseModel):
    machine_name: str


class MachineRegistrationTokenResponse(BaseModel):
    machine_name: str
    registration_token: str
    expires_in_hours: int = 24


class MachineRegistrationRequest(BaseModel):
    registration_token: str
    machine_name: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    operating_system: Optional[str] = None
    python_version: Optional[str] = None
    agent_version: Optional[str] = "1.0.0"


class MachineRegistrationResponse(BaseModel):
    machine_id: str
    machine_name: str
    agent_token: str
    message: str = "Machine registered successfully"


class MachineHeartbeatRequest(BaseModel):
    machine_id: str
    status: MachineStatus = MachineStatus.ONLINE
    cpu_usage: float = Field(default=0.0, ge=0.0, le=100.0)
    memory_usage: float = Field(default=0.0, ge=0.0, le=100.0)
    disk_usage: float = Field(default=0.0, ge=0.0, le=100.0)
    python_version: Optional[str] = None
    agent_version: Optional[str] = None
    hostname: Optional[str] = None
    ip_address: Optional[str] = None


class MachineHeartbeatResponse(BaseModel):
    status: str = "acknowledged"
    has_assigned_job: bool = False
    assigned_job_id: Optional[str] = None


class MachineResponse(MachineBase):
    id: int
    machine_id: str
    ip_address: Optional[str] = None
    status: MachineStatus
    last_heartbeat: Optional[datetime] = None
    cpu_usage: Optional[float] = 0.0
    memory_usage: Optional[float] = 0.0
    disk_usage: Optional[float] = 0.0
    registered_at: Optional[datetime] = None
    current_job_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MachinePingLogResponse(BaseModel):
    id: int
    machine_id: str
    status: str
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    timestamp: datetime

    class Config:
        from_attributes = True

