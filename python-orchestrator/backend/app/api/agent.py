from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.job import ErrorType, JobStatus
from app.models.machine import Machine
from app.schemas.job import (
    JobDispatch,
    JobLogBatchCreate,
    JobStatusUpdate,
)
from app.schemas.machine import (
    MachineHeartbeatRequest,
    MachineHeartbeatResponse,
    MachineRegistrationRequest,
    MachineRegistrationResponse,
)
from app.services.job_service import job_service
from app.services.log_service import log_service
from app.services.machine_service import machine_service

router = APIRouter(prefix="/api/agent", tags=["Agent Operations"])


async def authenticate_agent(
    x_machine_id: str = Header(..., alias="X-Machine-Id"),
    x_agent_token: str = Header(..., alias="X-Agent-Token"),
    db: AsyncSession = Depends(get_db),
) -> Machine:
    """Dependency to verify Machine Agent authentication on outbound requests"""
    return await machine_service.verify_agent(db, x_machine_id, x_agent_token)


@router.post("/register", response_model=MachineRegistrationResponse)
async def register_machine_agent(
    req: MachineRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Initial handshake for Machine Agent using single-use registration token"""
    return await machine_service.register_agent(db, req)


@router.post("/heartbeat", response_model=MachineHeartbeatResponse)
async def send_heartbeat(
    req: MachineHeartbeatRequest,
    machine: Machine = Depends(authenticate_agent),
    db: AsyncSession = Depends(get_db),
):
    """Periodic health beacon reporting CPU/RAM/Disk metrics"""
    return await machine_service.process_heartbeat(db, machine, req)


@router.get("/jobs", response_model=Optional[JobDispatch])
async def poll_jobs(
    response: Response,
    machine: Machine = Depends(authenticate_agent),
    db: AsyncSession = Depends(get_db),
):
    """Machine Agent polls for next pending job dispatch"""
    dispatch = await job_service.get_pending_job_for_machine(db, machine.machine_id)
    if not dispatch:
        response.status_code = status.HTTP_204_NO_CONTENT
        return None
    return dispatch


@router.post("/jobs/{job_id}/status")
async def update_job_status(
    job_id: str,
    req: JobStatusUpdate,
    machine: Machine = Depends(authenticate_agent),
    db: AsyncSession = Depends(get_db),
):
    """Agent updates execution phase (PREPARING, INSTALLING_DEPENDENCIES, RUNNING, etc.)"""
    job = await job_service.update_job_status(db, job_id, req)
    return {"status": "success", "job_status": job.status.value}


@router.post("/jobs/{job_id}/logs")
async def append_job_logs(
    job_id: str,
    req: JobLogBatchCreate,
    machine: Machine = Depends(authenticate_agent),
    db: AsyncSession = Depends(get_db),
):
    """Agent streams real-time stdout/stderr log batch"""
    count = await log_service.append_log_batch(db, job_id, req.logs)
    return {"status": "success", "inserted_logs_count": count}


@router.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: str,
    req: JobStatusUpdate,
    machine: Machine = Depends(authenticate_agent),
    db: AsyncSession = Depends(get_db),
):
    """Agent reports final execution completion (SUCCESS / FAILED with exit code)"""
    final_status = req.status if req.status in [JobStatus.SUCCESS, JobStatus.FAILED] else (
        JobStatus.SUCCESS if req.exit_code == 0 else JobStatus.FAILED
    )
    update_data = JobStatusUpdate(
        status=final_status,
        commit_sha=req.commit_sha,
        exit_code=req.exit_code,
        error_message=req.error_message,
        error_type=req.error_type or ErrorType.NONE,
    )
    job = await job_service.update_job_status(db, job_id, update_data)
    return {"status": "success", "final_job_status": job.status.value}


@router.post("/jobs/{job_id}/error")
async def report_job_error(
    job_id: str,
    req: JobStatusUpdate,
    machine: Machine = Depends(authenticate_agent),
    db: AsyncSession = Depends(get_db),
):
    """Agent reports unrecoverable infrastructure or environment setup error"""
    update_data = JobStatusUpdate(
        status=JobStatus.FAILED,
        exit_code=req.exit_code or 1,
        error_message=req.error_message or "Infrastructure or preparation failure",
        error_type=req.error_type or ErrorType.INFRASTRUCTURE_ERROR,
    )
    job = await job_service.update_job_status(db, job_id, update_data)
    return {"status": "success", "final_job_status": job.status.value}
