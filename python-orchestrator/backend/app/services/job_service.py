from datetime import datetime, timezone
import random
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credential import Credential, CredentialType
from app.models.job import ErrorType, Job, JobStatus
from app.models.machine import Machine, MachineStatus
from app.models.repository import Repository
from app.schemas.job import JobCreate, JobDispatch, JobStatusUpdate
from app.services.credential_service import credential_service
from app.services.github_service import github_service
from app.websocket.manager import ws_manager


class JobService:
    @staticmethod
    def _generate_job_id() -> str:
        num = random.randint(10000, 99999)
        return f"JOB-{num}"

    async def create_job(
        self, db: AsyncSession, req: JobCreate, created_by: str = "admin", schedule_id: Optional[int] = None
    ) -> Job:
        # Validate machine
        m_query = select(Machine).where(Machine.machine_id == req.machine_id)
        m_result = await db.execute(m_query)
        machine = m_result.scalar_one_or_none()
        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Machine {req.machine_id} not found",
            )
        if machine.status == MachineStatus.DISABLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Machine {machine.machine_name} is disabled",
            )

        # Resolve commit SHA if not supplied
        commit_sha = req.commit_sha
        if not commit_sha:
            try:
                owner = req.repository_url.rstrip("/").split("/")[-2] if "/" in req.repository_url else "orchestrator-demo"
                repo_name = req.repository_name
                commit_info = await github_service.get_latest_commit(owner, repo_name, req.branch)
                commit_sha = commit_info.sha
            except Exception:
                commit_sha = "a1b2c3d4e5f67890123456789abcdef012345678"

        job = Job(
            job_id=self._generate_job_id(),
            repository_id=req.repository_id,
            repository_name=req.repository_name,
            repository_url=req.repository_url,
            branch=req.branch,
            commit_sha=commit_sha,
            entry_point=req.entry_point,
            machine_id=req.machine_id,
            status=JobStatus.QUEUED,
            parameters=req.parameters or [],
            environment_variables=req.environment_variables or {},
            timeout_seconds=req.timeout_seconds or 1800,
            max_retries=req.max_retries or 0,
            created_by=created_by,
            schedule_id=schedule_id,
        )

        db.add(job)
        await db.commit()
        await db.refresh(job)

        # Broadcast update to web UI
        await ws_manager.broadcast_job_status(job.job_id, {
            "job_id": job.job_id,
            "status": job.status.value,
            "machine_id": job.machine_id,
            "repository_name": job.repository_name,
            "branch": job.branch,
            "commit_sha": job.commit_sha,
            "entry_point": job.entry_point,
            "created_at": job.created_at.isoformat(),
        })

        return job

    async def get_pending_job_for_machine(
        self, db: AsyncSession, machine_id: str
    ) -> Optional[JobDispatch]:
        # Look for active assigned or oldest queued job for this machine
        query = (
            select(Job)
            .where(
                Job.machine_id == machine_id,
                Job.status.in_([JobStatus.QUEUED, JobStatus.ASSIGNED]),
            )
            .order_by(Job.created_at.asc())
            .limit(1)
        )
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if not job:
            return None

        # Transition status to ASSIGNED if QUEUED
        if job.status == JobStatus.QUEUED:
            job.status = JobStatus.ASSIGNED
            # Associate current job with machine
            m_query = select(Machine).where(Machine.machine_id == machine_id)
            m_res = await db.execute(m_query)
            machine = m_res.scalar_one_or_none()
            if machine:
                machine.current_job_id = job.job_id
                machine.status = MachineStatus.BUSY

            await db.commit()
            await db.refresh(job)

            await ws_manager.broadcast_job_status(job.job_id, {
                "job_id": job.job_id,
                "status": job.status.value,
                "machine_id": job.machine_id,
            })

        # Decrypt GitHub token if repository has associated credentials
        github_token = None
        if job.repository_id:
            r_query = select(Repository).where(Repository.id == job.repository_id)
            r_res = await db.execute(r_query)
            repo = r_res.scalar_one_or_none()
            if repo and repo.credential_id:
                c_query = select(Credential).where(Credential.id == repo.credential_id)
                c_res = await db.execute(c_query)
                cred = c_res.scalar_one_or_none()
                if cred:
                    github_token = credential_service.decrypt(cred.encrypted_value)

        return JobDispatch(
            job_id=job.job_id,
            repository_url=job.repository_url,
            repository_name=job.repository_name,
            branch=job.branch,
            commit_sha=job.commit_sha,
            entry_point=job.entry_point,
            parameters=job.parameters or [],
            environment_variables=job.environment_variables or {},
            timeout_seconds=job.timeout_seconds,
            github_token=github_token,
        )

    async def update_job_status(
        self, db: AsyncSession, job_id: str, update_data: JobStatusUpdate
    ) -> Job:
        query = select(Job).where(Job.job_id == job_id)
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found",
            )

        job.status = update_data.status
        now = datetime.now(timezone.utc)

        if update_data.commit_sha:
            job.commit_sha = update_data.commit_sha

        if update_data.status in [JobStatus.PREPARING, JobStatus.INSTALLING_DEPENDENCIES, JobStatus.RUNNING]:
            if not job.started_at:
                job.started_at = now

        if update_data.status in [JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELLED, JobStatus.TIMEOUT]:
            job.completed_at = now
            if job.started_at:
                s_at = job.started_at
                if s_at.tzinfo is None:
                    s_at = s_at.replace(tzinfo=timezone.utc)
                job.duration_seconds = round((now - s_at).total_seconds(), 2)
            job.exit_code = update_data.exit_code
            job.error_message = update_data.error_message
            if update_data.error_type:
                job.error_type = update_data.error_type

            # Free the machine
            m_query = select(Machine).where(Machine.machine_id == job.machine_id)
            m_res = await db.execute(m_query)
            machine = m_res.scalar_one_or_none()
            if machine:
                machine.current_job_id = None
                if machine.status != MachineStatus.DISABLED:
                    machine.status = MachineStatus.ONLINE

        await db.commit()
        await db.refresh(job)

        # Broadcast status update
        await ws_manager.broadcast_job_status(job.job_id, {
            "job_id": job.job_id,
            "status": job.status.value,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "duration_seconds": job.duration_seconds,
            "exit_code": job.exit_code,
            "error_message": job.error_message,
        })

        return job

    async def cancel_job(self, db: AsyncSession, job_id: str, user_name: str) -> Job:
        return await self.update_job_status(
            db,
            job_id,
            JobStatusUpdate(
                status=JobStatus.CANCELLED,
                error_message=f"Job manually stopped by {user_name}",
            ),
        )

    async def retry_job(
        self, db: AsyncSession, job_id: str, user_name: str, use_latest: bool = False
    ) -> Job:
        query = select(Job).where(Job.job_id == job_id)
        result = await db.execute(query)
        orig = result.scalar_one_or_none()

        if not orig:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found",
            )

        commit_sha = None if use_latest else orig.commit_sha

        new_job_req = JobCreate(
            repository_id=orig.repository_id,
            repository_name=orig.repository_name,
            repository_url=orig.repository_url,
            branch=orig.branch,
            commit_sha=commit_sha,
            entry_point=orig.entry_point,
            machine_id=orig.machine_id,
            parameters=orig.parameters or [],
            environment_variables=orig.environment_variables or {},
            timeout_seconds=orig.timeout_seconds,
            max_retries=orig.max_retries,
        )

        new_job = await self.create_job(db, new_job_req, created_by=user_name)
        new_job.retry_count = orig.retry_count + 1
        await db.commit()
        await db.refresh(new_job)
        return new_job


job_service = JobService()
