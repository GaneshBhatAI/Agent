from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.job import Job
from app.models.machine import Machine, MachineStatus
from app.models.user import User, UserRole
from app.schemas.job import JobResponse
from app.schemas.machine import (
    MachineCreate,
    MachineRegistrationTokenResponse,
    MachineResponse,
)
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service
from app.services.machine_service import machine_service

router = APIRouter(prefix="/api/machines", tags=["Machines"])


@router.get("", response_model=List[MachineResponse])
async def list_machines(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    # Check for stale/offline machines before returning
    await machine_service.check_offline_machines(db)

    query = select(Machine).order_by(Machine.status.asc(), Machine.machine_name.asc())
    result = await db.execute(query)
    machines = result.scalars().all()
    return [MachineResponse.model_validate(m) for m in machines]


@router.post("/generate-token", response_model=MachineRegistrationTokenResponse)
async def generate_machine_registration_token(
    req: MachineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    token = await machine_service.generate_registration_token(db, req.machine_name.strip())
    
    await audit_service.log_action(
        db,
        action="MACHINE_TOKEN_GENERATED",
        resource="machine",
        resource_id=req.machine_name,
        user=current_user,
        details={"machine_name": req.machine_name},
    )

    return MachineRegistrationTokenResponse(
        machine_name=req.machine_name,
        registration_token=token,
    )


@router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    query = select(Machine).where(Machine.machine_id == machine_id)
    result = await db.execute(query)
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine {machine_id} not found",
        )
    return MachineResponse.model_validate(machine)


@router.get("/{machine_id}/jobs", response_model=List[JobResponse])
async def get_machine_jobs(
    machine_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    query = (
        select(Job)
        .where(Job.machine_id == machine_id)
        .order_by(desc(Job.created_at))
        .limit(limit)
    )
    result = await db.execute(query)
    jobs = result.scalars().all()
    return [JobResponse.model_validate(j) for j in jobs]


@router.post("/{machine_id}/enable", response_model=MachineResponse)
async def enable_machine(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    query = select(Machine).where(Machine.machine_id == machine_id)
    result = await db.execute(query)
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    machine.status = MachineStatus.ONLINE
    await db.commit()
    await db.refresh(machine)

    await audit_service.log_action(
        db,
        action="MACHINE_ENABLED",
        resource="machine",
        resource_id=machine_id,
        user=current_user,
    )

    return MachineResponse.model_validate(machine)


@router.post("/{machine_id}/disable", response_model=MachineResponse)
async def disable_machine(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    query = select(Machine).where(Machine.machine_id == machine_id)
    result = await db.execute(query)
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    machine.status = MachineStatus.DISABLED
    await db.commit()
    await db.refresh(machine)

    await audit_service.log_action(
        db,
        action="MACHINE_DISABLED",
        resource="machine",
        resource_id=machine_id,
        user=current_user,
    )

    return MachineResponse.model_validate(machine)


@router.delete("/{machine_id}")
async def delete_machine(
    machine_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN])),
):
    query = select(Machine).where(Machine.machine_id == machine_id)
    result = await db.execute(query)
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    await db.delete(machine)
    await db.commit()

    await audit_service.log_action(
        db,
        action="MACHINE_DELETED",
        resource="machine",
        resource_id=machine_id,
        user=current_user,
    )

    return {"status": "success", "message": f"Machine {machine_id} removed"}
