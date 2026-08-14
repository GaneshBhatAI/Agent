from datetime import datetime, time, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.job import Job, JobStatus
from app.models.machine import Machine, MachineStatus
from app.models.repository import Repository
from app.models.schedule import Schedule
from app.models.user import User
from app.schemas.dashboard import (
    DashboardStatsResponse,
    JobOverviewStats,
    MachineOverviewStats,
)
from app.schemas.job import JobResponse
from app.services.auth_service import auth_service
from app.services.machine_service import machine_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    # Ensure offline check is up-to-date
    await machine_service.check_offline_machines(db)

    # Machine stats
    m_query = select(Machine.status, func.count(Machine.id)).group_by(Machine.status)
    m_res = await db.execute(m_query)
    m_counts = dict(m_res.all())

    machines_stat = MachineOverviewStats(
        total=sum(m_counts.values()),
        online=m_counts.get(MachineStatus.ONLINE, 0),
        busy=m_counts.get(MachineStatus.BUSY, 0),
        offline=m_counts.get(MachineStatus.OFFLINE, 0),
        disabled=m_counts.get(MachineStatus.DISABLED, 0),
    )

    # Job stats today
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min).replace(tzinfo=timezone.utc)

    j_query = select(Job.status, func.count(Job.id)).where(Job.created_at >= today_start).group_by(Job.status)
    j_res = await db.execute(j_query)
    j_counts = dict(j_res.all())

    total_today = sum(j_counts.values())
    succ = j_counts.get(JobStatus.SUCCESS, 0)
    failed = j_counts.get(JobStatus.FAILED, 0) + j_counts.get(JobStatus.TIMEOUT, 0)
    completed_total = succ + failed
    success_rate = round((succ / completed_total * 100), 1) if completed_total > 0 else 100.0

    jobs_stat = JobOverviewStats(
        total_today=total_today,
        running=j_counts.get(JobStatus.RUNNING, 0) + j_counts.get(JobStatus.PREPARING, 0) + j_counts.get(JobStatus.INSTALLING_DEPENDENCIES, 0),
        queued=j_counts.get(JobStatus.QUEUED, 0) + j_counts.get(JobStatus.ASSIGNED, 0),
        success=succ,
        failed=failed,
        cancelled=j_counts.get(JobStatus.CANCELLED, 0),
        success_rate_percent=success_rate,
    )

    # Recent jobs
    recent_query = select(Job).order_by(desc(Job.created_at)).limit(10)
    recent_res = await db.execute(recent_query)
    recent_jobs = [JobResponse.model_validate(j) for j in recent_res.scalars().all()]

    # Active schedules count
    s_query = select(func.count(Schedule.id)).where(Schedule.enabled.is_(True))
    s_res = await db.execute(s_query)
    active_scheds = s_res.scalar() or 0

    # Repositories count
    r_query = select(func.count(Repository.id))
    r_res = await db.execute(r_query)
    repo_count = r_res.scalar() or 0

    return DashboardStatsResponse(
        machines=machines_stat,
        jobs=jobs_stat,
        recent_jobs=recent_jobs,
        active_schedules_count=active_scheds,
        connected_repos_count=repo_count,
    )
