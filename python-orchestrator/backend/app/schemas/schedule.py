from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.schedule import ScheduleType


class ScheduleBase(BaseModel):
    name: str
    repository_id: Optional[int] = None
    repository_name: str
    repository_url: str
    branch: str = "main"
    entry_point: str = "main.py"
    machine_id: str
    schedule_type: ScheduleType = ScheduleType.CRON
    cron_expression: Optional[str] = "0 8 * * *"
    interval_minutes: Optional[int] = None
    enabled: bool = True
    parameters: Optional[List[str]] = Field(default_factory=list)
    environment_variables: Optional[Dict[str, str]] = Field(default_factory=dict)


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    repository_name: Optional[str] = None
    repository_url: Optional[str] = None
    branch: Optional[str] = None
    entry_point: Optional[str] = None
    machine_id: Optional[str] = None
    schedule_type: Optional[ScheduleType] = None
    cron_expression: Optional[str] = None
    interval_minutes: Optional[int] = None
    enabled: Optional[bool] = None
    parameters: Optional[List[str]] = None
    environment_variables: Optional[Dict[str, str]] = None


class ScheduleResponse(ScheduleBase):
    id: int
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    last_job_id: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
