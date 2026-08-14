from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.job import Job, JobStatus
from app.models.user import User, UserRole
from app.schemas.job import JobCreate, JobResponse
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service
from app.services.job_service import job_service

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post("", response_model=JobResponse)
async def create_job(
    req: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    job = await job_service.create_job(db, req, created_by=current_user.username)
    
    await audit_service.log_action(
        db,
        action="JOB_CREATED",
        resource="job",
        resource_id=job.job_id,
        user=current_user,
        details={
            "job_id": job.job_id,
            "machine_id": job.machine_id,
            "repo": job.repository_name,
            "entry_point": job.entry_point,
        },
    )

    return JobResponse.model_validate(job)


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    status_filter: Optional[JobStatus] = Query(None, alias="status"),
    machine_id: Optional[str] = Query(None),
    repository_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    query = select(Job)
    if status_filter:
        query = query.where(Job.status == status_filter)
    if machine_id:
        query = query.where(Job.machine_id == machine_id)
    if repository_name:
        query = query.where(Job.repository_name == repository_name)

    query = query.order_by(desc(Job.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    jobs = result.scalars().all()
    return [JobResponse.model_validate(j) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    query = select(Job).where(Job.job_id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        )
    return JobResponse.model_validate(job)


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    job = await job_service.cancel_job(db, job_id, current_user.username)
    
    await audit_service.log_action(
        db,
        action="JOB_CANCELLED",
        resource="job",
        resource_id=job_id,
        user=current_user,
    )

    return JobResponse.model_validate(job)


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    new_job = await job_service.retry_job(db, job_id, current_user.username, use_latest=False)
    
    await audit_service.log_action(
        db,
        action="JOB_RETRIED",
        resource="job",
        resource_id=new_job.job_id,
        user=current_user,
        details={"original_job_id": job_id},
    )

    return JobResponse.model_validate(new_job)


@router.post("/{job_id}/run-latest", response_model=JobResponse)
async def run_latest_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    new_job = await job_service.retry_job(db, job_id, current_user.username, use_latest=True)
    
    await audit_service.log_action(
        db,
        action="JOB_RUN_LATEST",
        resource="job",
        resource_id=new_job.job_id,
        user=current_user,
        details={"original_job_id": job_id},
    )

    return JobResponse.model_validate(new_job)
