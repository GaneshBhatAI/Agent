from typing import List, Optional
from pydantic import BaseModel
from app.schemas.job import JobResponse


class MachineOverviewStats(BaseModel):
    total: int = 0
    online: int = 0
    busy: int = 0
    offline: int = 0
    disabled: int = 0


class JobOverviewStats(BaseModel):
    total_today: int = 0
    running: int = 0
    queued: int = 0
    success: int = 0
    failed: int = 0
    cancelled: int = 0
    success_rate_percent: float = 0.0


class DashboardStatsResponse(BaseModel):
    machines: MachineOverviewStats
    jobs: JobOverviewStats
    recent_jobs: List[JobResponse]
    active_schedules_count: int = 0
    connected_repos_count: int = 0
