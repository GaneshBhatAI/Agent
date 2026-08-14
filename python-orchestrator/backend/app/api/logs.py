from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.job_log import LogLevel
from app.models.user import User
from app.schemas.job import JobLogResponse
from app.services.auth_service import auth_service
from app.services.log_service import log_service

router = APIRouter(prefix="/api/jobs", tags=["Logs"])


@router.get("/{job_id}/logs", response_model=List[JobLogResponse])
async def get_job_logs(
    job_id: str,
    level: Optional[LogLevel] = Query(None),
    limit: int = Query(1000, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    logs = await log_service.get_job_logs(db, job_id, level=level, limit=limit, offset=offset)
    return [JobLogResponse.model_validate(l) for l in logs]
