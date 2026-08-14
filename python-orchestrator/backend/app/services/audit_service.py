from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.models.user import User


class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        action: str,
        resource: str,
        resource_id: Optional[str] = None,
        user: Optional[User] = None,
        username: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        actual_username = username or (user.username if user else "SYSTEM")
        user_id = user.id if user else None
        
        audit_entry = AuditLog(
            user_id=user_id,
            username=actual_username,
            action=action,
            resource=resource,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
        )
        db.add(audit_entry)
        await db.commit()
        return audit_entry


audit_service = AuditService()
