from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.machine import Machine, MachineStatus
from app.schemas.machine import (
    MachineHeartbeatRequest,
    MachineHeartbeatResponse,
    MachineRegistrationRequest,
    MachineRegistrationResponse,
)
from app.websocket.manager import ws_manager


class MachineService:
    @staticmethod
    def _hash_token(token: str) -> str:
        return hmac.new(
            settings.AGENT_TOKEN_SECRET.encode(), token.encode(), hashlib.sha256
        ).hexdigest()

    async def generate_registration_token(
        self, db: AsyncSession, machine_name: str
    ) -> str:
        # Check if machine already exists
        query = select(Machine).where(Machine.machine_name == machine_name)
        result = await db.execute(query)
        machine = result.scalar_one_or_none()

        token = secrets.token_hex(24)

        if machine:
            machine.registration_token = token
            machine.status = MachineStatus.OFFLINE
        else:
            machine_id = f"MACH-{secrets.token_hex(6).upper()}"
            machine = Machine(
                machine_name=machine_name,
                machine_id=machine_id,
                registration_token=token,
                status=MachineStatus.OFFLINE,
            )
            db.add(machine)

        await db.commit()
        await db.refresh(machine)
        return token

    async def register_agent(
        self, db: AsyncSession, req: MachineRegistrationRequest
    ) -> MachineRegistrationResponse:
        # Find machine by registration token
        query = select(Machine).where(
            Machine.registration_token == req.registration_token
        )
        result = await db.execute(query)
        machine = result.scalar_one_or_none()

        if not machine:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired registration token",
            )

        # Generate unique secret agent token for authentication
        agent_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(agent_token)

        machine.hostname = req.hostname
        machine.ip_address = req.ip_address
        machine.operating_system = req.operating_system or "Windows"
        machine.python_version = req.python_version
        machine.agent_version = req.agent_version or "1.0.0"
        machine.status = MachineStatus.ONLINE
        machine.last_heartbeat = datetime.now(timezone.utc)
        machine.registered_at = datetime.now(timezone.utc)
        machine.agent_token_hash = token_hash
        # Invalidate registration token once used
        machine.registration_token = None

        await db.commit()
        await db.refresh(machine)

        # Broadcast update to web UI
        await ws_manager.broadcast_machine_update({
            "machine_id": machine.machine_id,
            "machine_name": machine.machine_name,
            "status": machine.status.value,
            "operating_system": machine.operating_system,
            "python_version": machine.python_version,
            "cpu_usage": machine.cpu_usage,
            "memory_usage": machine.memory_usage,
            "disk_usage": machine.disk_usage,
            "last_heartbeat": machine.last_heartbeat.isoformat() if machine.last_heartbeat else None,
        })

        return MachineRegistrationResponse(
            machine_id=machine.machine_id,
            machine_name=machine.machine_name,
            agent_token=agent_token,
            message="Machine registered successfully",
        )

    async def verify_agent(
        self, db: AsyncSession, machine_id: str, agent_token: str
    ) -> Machine:
        query = select(Machine).where(Machine.machine_id == machine_id)
        result = await db.execute(query)
        machine = result.scalar_one_or_none()

        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Machine {machine_id} not found",
            )

        if not machine.agent_token_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Machine is not fully registered",
            )

        expected_hash = machine.agent_token_hash
        computed_hash = self._hash_token(agent_token)

        if not hmac.compare_digest(expected_hash, computed_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid machine authentication token",
            )

        if machine.status == MachineStatus.DISABLED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Machine is currently disabled by administrator",
            )

        return machine

    async def process_heartbeat(
        self, db: AsyncSession, machine: Machine, req: MachineHeartbeatRequest
    ) -> MachineHeartbeatResponse:
        machine.last_heartbeat = datetime.now(timezone.utc)
        machine.cpu_usage = req.cpu_usage
        machine.memory_usage = req.memory_usage
        machine.disk_usage = req.disk_usage
        if req.python_version:
            machine.python_version = req.python_version
        if req.agent_version:
            machine.agent_version = req.agent_version
        if req.hostname:
            machine.hostname = req.hostname
        if req.ip_address:
            machine.ip_address = req.ip_address

        # Status transition: if running job, status is BUSY; else ONLINE
        if machine.current_job_id:
            machine.status = MachineStatus.BUSY
        elif machine.status != MachineStatus.DISABLED:
            machine.status = MachineStatus.ONLINE

        await db.commit()

        # Broadcast update to web UI
        await ws_manager.broadcast_machine_update({
            "machine_id": machine.machine_id,
            "machine_name": machine.machine_name,
            "status": machine.status.value,
            "operating_system": machine.operating_system,
            "python_version": machine.python_version,
            "agent_version": machine.agent_version,
            "cpu_usage": machine.cpu_usage,
            "memory_usage": machine.memory_usage,
            "disk_usage": machine.disk_usage,
            "current_job_id": machine.current_job_id,
            "last_heartbeat": machine.last_heartbeat.isoformat() if machine.last_heartbeat else None,
        })

        return MachineHeartbeatResponse(
            status="acknowledged",
            has_assigned_job=bool(machine.current_job_id),
            assigned_job_id=machine.current_job_id,
        )

    async def check_offline_machines(self, db: AsyncSession) -> int:
        threshold = datetime.now(timezone.utc) - timedelta(
            seconds=settings.HEARTBEAT_TIMEOUT_SECONDS
        )
        query = select(Machine).where(
            Machine.status.in_([MachineStatus.ONLINE, MachineStatus.BUSY])
        )
        result = await db.execute(query)
        machines = result.scalars().all()

        count = 0
        for m in machines:
            is_stale = False
            if m.last_heartbeat is None:
                is_stale = True
            else:
                lh = m.last_heartbeat
                if lh.tzinfo is None:
                    lh = lh.replace(tzinfo=timezone.utc)
                if lh < threshold:
                    is_stale = True

            if is_stale:
                m.status = MachineStatus.OFFLINE
                count += 1
                await ws_manager.broadcast_machine_update({
                    "machine_id": m.machine_id,
                    "machine_name": m.machine_name,
                    "status": MachineStatus.OFFLINE.value,
                    "cpu_usage": 0.0,
                    "memory_usage": 0.0,
                    "disk_usage": 0.0,
                    "last_heartbeat": m.last_heartbeat.isoformat() if m.last_heartbeat else None,
                })

        if count > 0:
            await db.commit()
        return count


machine_service = MachineService()
