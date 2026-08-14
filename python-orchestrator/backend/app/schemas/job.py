from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.job import ErrorType, JobStatus
from app.models.job_log import LogLevel


class JobCreate(BaseModel):
    repository_id: Optional[int] = None
    repository_name: str
    repository_url: str
    branch: str = "main"
    commit_sha: Optional[str] = None
    entry_point: str = "main.py"
    machine_id: str
    parameters: Optional[List[str]] = Field(default_factory=list)
    environment_variables: Optional[Dict[str, str]] = Field(default_factory=dict)
    timeout_seconds: Optional[int] = 1800
    max_retries: Optional[int] = 0


class JobStatusUpdate(BaseModel):
    status: JobStatus
    commit_sha: Optional[str] = None
    exit_code: Optional[int] = None
    error_message: Optional[str] = None
    error_type: Optional[ErrorType] = ErrorType.NONE


class JobLogCreate(BaseModel):
    level: LogLevel = LogLevel.INFO
    message: str
    timestamp: Optional[datetime] = None


class JobLogBatchCreate(BaseModel):
    logs: List[JobLogCreate]


class JobLogResponse(BaseModel):
    id: int
    job_id: str
    timestamp: datetime
    level: LogLevel
    message: str

    class Config:
        from_attributes = True


class JobResponse(BaseModel):
    id: int
    job_id: str
    repository_id: Optional[int] = None
    repository_name: str
    repository_url: str
    branch: str
    commit_sha: Optional[str] = None
    entry_point: str
    machine_id: str
    status: JobStatus
    parameters: Optional[List[str]] = None
    environment_variables: Optional[Dict[str, str]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    exit_code: Optional[int] = None
    error_message: Optional[str] = None
    error_type: ErrorType
    retry_count: int
    max_retries: int
    timeout_seconds: int
    created_by: str
    schedule_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobDispatch(BaseModel):
    """Payload sent to Agent when a job is assigned"""
    job_id: str
    repository_url: str
    repository_name: str
    branch: str
    commit_sha: Optional[str] = None
    entry_point: str
    parameters: List[str] = Field(default_factory=list)
    environment_variables: Dict[str, str] = Field(default_factory=dict)
    timeout_seconds: int = 1800
    github_token: Optional[str] = None  # If private repo, injected securely by backend
