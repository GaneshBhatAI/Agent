from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit_log import AuditLogResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/audit-logs", tags=["Audit"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    resource: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN])),
):
    query = select(AuditLog)
    if resource:
        query = query.where(AuditLog.resource == resource)
    if action:
        query = query.where(AuditLog.action == action)

    query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(l) for l in logs]
