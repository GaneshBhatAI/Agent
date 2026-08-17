from datetime import datetime, timezone
import logging
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.schedule import Schedule, ScheduleType
from app.schemas.job import JobCreate

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("APScheduler service started successfully")
            
            # Register built-in background tasks
            self.scheduler.add_job(
                self._execute_ping_cleanup,
                trigger=IntervalTrigger(minutes=5),
                id="system_ping_cleanup",
                name="System_Ping_Cleanup",
                replace_existing=True,
            )

    def shutdown(self):
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("APScheduler service shut down")

    async def load_all_schedules(self):
        """Load and register all active schedules from DB on startup"""
        try:
            async with AsyncSessionLocal() as db:
                query = select(Schedule).where(Schedule.enabled.is_(True))
                result = await db.execute(query)
                schedules = result.scalars().all()
                for s in schedules:
                    self.register_schedule_job(s)
                logger.info(f"Loaded {len(schedules)} active schedules into APScheduler")
        except Exception as e:
            logger.error(f"Failed to load schedules from database: {e}")

    def register_schedule_job(self, schedule: Schedule):
        job_id = f"schedule_{schedule.id}"
        
        # Remove existing if already present
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)

        if not schedule.enabled:
            return

        trigger = None
        if schedule.schedule_type == ScheduleType.CRON and schedule.cron_expression:
            try:
                trigger = CronTrigger.from_crontab(schedule.cron_expression)
            except Exception as e:
                logger.error(f"Invalid cron expression '{schedule.cron_expression}' for schedule {schedule.id}: {e}")
                return
        elif schedule.schedule_type == ScheduleType.INTERVAL and schedule.interval_minutes:
            trigger = IntervalTrigger(minutes=schedule.interval_minutes)

        if trigger:
            self.scheduler.add_job(
                self._execute_scheduled_task,
                trigger=trigger,
                id=job_id,
                name=f"Schedule_{schedule.name}",
                args=[schedule.id],
                replace_existing=True,
            )
            logger.info(f"Registered schedule job {job_id} ({schedule.name})")

    def unregister_schedule_job(self, schedule_id: int):
        job_id = f"schedule_{schedule_id}"
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
            logger.info(f"Unregistered schedule job {job_id}")

    @staticmethod
    async def _execute_scheduled_task(schedule_id: int):
        """Fires scheduled job by creating a standard Job record through JobService"""
        from app.services.job_service import job_service

        logger.info(f"Triggering scheduled execution for schedule_id: {schedule_id}")
        async with AsyncSessionLocal() as db:
            try:
                query = select(Schedule).where(Schedule.id == schedule_id)
                res = await db.execute(query)
                sched = res.scalar_one_or_none()
                if not sched or not sched.enabled:
                    return

                job_req = JobCreate(
                    repository_id=sched.repository_id,
                    repository_name=sched.repository_name,
                    repository_url=sched.repository_url,
                    branch=sched.branch,
                    entry_point=sched.entry_point,
                    machine_id=sched.machine_id,
                    parameters=sched.parameters or [],
                    environment_variables=sched.environment_variables or {},
                )

                created_job = await job_service.create_job(
                    db, job_req, created_by=f"Scheduler ({sched.name})", schedule_id=sched.id
                )

                sched.last_run_at = datetime.now(timezone.utc)
                sched.last_job_id = created_job.job_id
                await db.commit()
                logger.info(f"Scheduled job created: {created_job.job_id} for schedule {sched.name}")
            except Exception as e:
                logger.error(f"Error executing scheduled task {schedule_id}: {e}")


    @staticmethod
    async def _execute_ping_cleanup():
        from app.services.machine_service import machine_service
        async with AsyncSessionLocal() as db:
            try:
                deleted = await machine_service.cleanup_old_pings(db)
                if deleted > 0:
                    logger.info(f"Cleaned up {deleted} old machine ping logs")
            except Exception as e:
                logger.error(f"Error cleaning up old machine pings: {e}")

scheduler_service = SchedulerService()
