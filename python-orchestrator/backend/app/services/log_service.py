from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.job_log import JobLog, LogLevel
from app.schemas.job import JobLogCreate
from app.websocket.manager import ws_manager


class LogService:
    async def append_log(
        self,
        db: AsyncSession,
        job_id: str,
        level: LogLevel,
        message: str,
        timestamp: Optional[datetime] = None,
    ) -> JobLog:
        ts = timestamp or datetime.now(timezone.utc)
        log_entry = JobLog(
            job_id=job_id,
            level=level,
            message=message,
            timestamp=ts,
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)

        # Broadcast in real-time over WebSocket
        await ws_manager.broadcast_job_log(
            job_id,
            {
                "id": log_entry.id,
                "job_id": job_id,
                "timestamp": log_entry.timestamp.isoformat(),
                "level": log_entry.level.value,
                "message": log_entry.message,
            },
        )

        return log_entry

    async def append_log_batch(
        self, db: AsyncSession, job_id: str, logs: List[JobLogCreate]
    ) -> int:
        if not logs:
            return 0

        created_entries = []
        for l in logs:
            ts = l.timestamp or datetime.now(timezone.utc)
            entry = JobLog(
                job_id=job_id,
                level=l.level,
                message=l.message,
                timestamp=ts,
            )
            db.add(entry)
            created_entries.append(entry)

        await db.commit()

        # Broadcast each to WebSocket subscribers
        for entry in created_entries:
            await ws_manager.broadcast_job_log(
                job_id,
                {
                    "id": entry.id,
                    "job_id": job_id,
                    "timestamp": entry.timestamp.isoformat(),
                    "level": entry.level.value,
                    "message": entry.message,
                },
            )

        return len(created_entries)

    async def get_job_logs(
        self,
        db: AsyncSession,
        job_id: str,
        level: Optional[LogLevel] = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> List[JobLog]:
        query = select(JobLog).where(JobLog.job_id == job_id)
        if level:
            query = query.where(JobLog.level == level)
        query = query.order_by(JobLog.timestamp.asc()).offset(offset).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def cleanup_old_logs(
        self, db: AsyncSession, retention_days: Optional[int] = None
    ) -> int:
        days = retention_days or settings.LOG_RETENTION_DAYS
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = delete(JobLog).where(JobLog.timestamp < cutoff)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount


log_service = LogService()
