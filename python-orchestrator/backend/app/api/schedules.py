from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.schedule import Schedule
from app.models.user import User, UserRole
from app.schemas.schedule import ScheduleCreate, ScheduleResponse, ScheduleUpdate
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service
from app.services.scheduler_service import scheduler_service

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])


@router.get("", response_model=List[ScheduleResponse])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    query = select(Schedule).order_by(desc(Schedule.created_at))
    result = await db.execute(query)
    schedules = result.scalars().all()
    return [ScheduleResponse.model_validate(s) for s in schedules]


@router.post("", response_model=ScheduleResponse)
async def create_schedule(
    req: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    # Check if name already exists
    query = select(Schedule).where(Schedule.name == req.name)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Schedule with name '{req.name}' already exists",
        )

    sched = Schedule(
        name=req.name,
        repository_id=req.repository_id,
        repository_name=req.repository_name,
        repository_url=req.repository_url,
        branch=req.branch,
        entry_point=req.entry_point,
        machine_id=req.machine_id,
        schedule_type=req.schedule_type,
        cron_expression=req.cron_expression,
        interval_minutes=req.interval_minutes,
        enabled=req.enabled,
        parameters=req.parameters or [],
        environment_variables=req.environment_variables or {},
        created_by=current_user.username,
    )
    db.add(sched)
    await db.commit()
    await db.refresh(sched)

    # Register with APScheduler
    scheduler_service.register_schedule_job(sched)

    await audit_service.log_action(
        db,
        action="SCHEDULE_CREATED",
        resource="schedule",
        resource_id=str(sched.id),
        user=current_user,
        details={"name": sched.name, "machine_id": sched.machine_id},
    )

    return ScheduleResponse.model_validate(sched)


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    query = select(Schedule).where(Schedule.id == schedule_id)
    result = await db.execute(query)
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return ScheduleResponse.model_validate(sched)


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    req: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    query = select(Schedule).where(Schedule.id == schedule_id)
    result = await db.execute(query)
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sched, key, value)

    await db.commit()
    await db.refresh(sched)

    # Re-register with scheduler
    scheduler_service.register_schedule_job(sched)

    await audit_service.log_action(
        db,
        action="SCHEDULE_UPDATED",
        resource="schedule",
        resource_id=str(sched.id),
        user=current_user,
    )

    return ScheduleResponse.model_validate(sched)


@router.post("/{schedule_id}/toggle", response_model=ScheduleResponse)
async def toggle_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    query = select(Schedule).where(Schedule.id == schedule_id)
    result = await db.execute(query)
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    sched.enabled = not sched.enabled
    await db.commit()
    await db.refresh(sched)

    if sched.enabled:
        scheduler_service.register_schedule_job(sched)
    else:
        scheduler_service.unregister_schedule_job(sched.id)

    await audit_service.log_action(
        db,
        action="SCHEDULE_TOGGLED",
        resource="schedule",
        resource_id=str(sched.id),
        user=current_user,
        details={"enabled": sched.enabled},
    )

    return ScheduleResponse.model_validate(sched)


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    query = select(Schedule).where(Schedule.id == schedule_id)
    result = await db.execute(query)
    sched = result.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")

    scheduler_service.unregister_schedule_job(sched.id)
    await db.delete(sched)
    await db.commit()

    await audit_service.log_action(
        db,
        action="SCHEDULE_DELETED",
        resource="schedule",
        resource_id=str(schedule_id),
        user=current_user,
    )

    return {"status": "success", "message": f"Schedule {schedule_id} deleted"}
