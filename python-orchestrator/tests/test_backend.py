import asyncio
import os
import sys
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Add backend directory to sys.path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.services.auth_service import auth_service
from app.services.credential_service import credential_service

TEST_DB_URL = "sqlite+aiosqlite://?cache=shared"

test_engine = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


async def _setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as db:
        admin = User(
            username="admin",
            email="admin@test.com",
            password_hash=auth_service.get_password_hash("Admin123!"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        await db.commit()


def test_auth_and_login():
    async def _run():
        await _setup_db()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/api/auth/login/json", json={"username": "admin", "password": "Admin123!"})
            assert resp.status_code == 200
            data = resp.json()
            assert "access_token" in data
            assert data["user"]["username"] == "admin"
            token = data["access_token"]

            me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me_resp.status_code == 200
            assert me_resp.json()["username"] == "admin"

    asyncio.run(_run())


def test_machine_registration_and_heartbeat():
    async def _run():
        await _setup_db()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            auth_resp = await client.post("/api/auth/login/json", json={"username": "admin", "password": "Admin123!"})
            token = auth_resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Generate token
            gen_resp = await client.post(
                "/api/machines/generate-token",
                json={"machine_name": "Machine-A"},
                headers=headers,
            )
            assert gen_resp.status_code == 200
            reg_token = gen_resp.json()["registration_token"]

            # Register
            agent_reg_resp = await client.post(
                "/api/agent/register",
                json={
                    "registration_token": reg_token,
                    "machine_name": "Machine-A",
                    "hostname": "win-node-01",
                    "operating_system": "Windows 11 Pro",
                    "python_version": "3.12.4",
                    "agent_version": "1.0.0",
                },
            )
            assert agent_reg_resp.status_code == 200
            reg_data = agent_reg_resp.json()
            machine_id = reg_data["machine_id"]
            agent_token = reg_data["agent_token"]

            # Heartbeat
            agent_headers = {
                "X-Machine-Id": machine_id,
                "X-Agent-Token": agent_token,
            }
            hb_resp = await client.post(
                "/api/agent/heartbeat",
                json={
                    "machine_id": machine_id,
                    "status": "ONLINE",
                    "cpu_usage": 22.5,
                    "memory_usage": 45.0,
                    "disk_usage": 60.0,
                    "python_version": "3.12.4",
                },
                headers=agent_headers,
            )
            assert hb_resp.status_code == 200
            assert hb_resp.json()["status"] == "acknowledged"

            # Check machines
            machines_resp = await client.get("/api/machines", headers=headers)
            assert machines_resp.status_code == 200
            mach_list = machines_resp.json()
            assert any(m["machine_id"] == machine_id and m["status"] == "ONLINE" for m in mach_list)

    asyncio.run(_run())


def test_job_dispatch_and_lifecycle():
    async def _run():
        await _setup_db()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            auth_resp = await client.post("/api/auth/login/json", json={"username": "admin", "password": "Admin123!"})
            token = auth_resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            gen_resp = await client.post("/api/machines/generate-token", json={"machine_name": "Machine-A"}, headers=headers)
            reg_token = gen_resp.json()["registration_token"]
            agent_resp = await client.post(
                "/api/agent/register",
                json={"registration_token": reg_token, "machine_name": "Machine-A", "operating_system": "Windows"},
            )
            machine_id = agent_resp.json()["machine_id"]
            agent_token = agent_resp.json()["agent_token"]
            agent_headers = {"X-Machine-Id": machine_id, "X-Agent-Token": agent_token}

            # Create Job
            job_create_resp = await client.post(
                "/api/jobs",
                json={
                    "repository_name": "hello-bot",
                    "repository_url": "https://github.com/orchestrator-demo/hello-bot",
                    "branch": "main",
                    "entry_point": "main.py",
                    "machine_id": machine_id,
                    "parameters": ["--env", "prod"],
                },
                headers=headers,
            )
            assert job_create_resp.status_code == 200
            job_id = job_create_resp.json()["job_id"]

            # Poll
            poll_resp = await client.get("/api/agent/jobs", headers=agent_headers)
            assert poll_resp.status_code == 200
            dispatch = poll_resp.json()
            assert dispatch["job_id"] == job_id

            # Status
            await client.post(
                f"/api/agent/jobs/{job_id}/status",
                json={"status": "RUNNING", "commit_sha": "a1b2c3d4e5f6"},
                headers=agent_headers,
            )

            # Logs
            log_resp = await client.post(
                f"/api/agent/jobs/{job_id}/logs",
                json={
                    "logs": [
                        {"level": "INFO", "message": "Cloning repository..."},
                        {"level": "INFO", "message": "Hello from Machine A"},
                    ]
                },
                headers=agent_headers,
            )
            assert log_resp.status_code == 200

            # Complete
            comp_resp = await client.post(
                f"/api/agent/jobs/{job_id}/complete",
                json={"status": "SUCCESS", "exit_code": 0, "commit_sha": "a1b2c3d4e5f6"},
                headers=agent_headers,
            )
            assert comp_resp.status_code == 200
            assert comp_resp.json()["final_job_status"] == "SUCCESS"

            # Check logs
            logs_resp = await client.get(f"/api/jobs/{job_id}/logs", headers=headers)
            assert logs_resp.status_code == 200
            logs = logs_resp.json()
            assert len(logs) == 2

    asyncio.run(_run())


def test_credential_encryption():
    secret = "ghp_VerySecretGitHubPersonalAccessToken12345"
    encrypted = credential_service.encrypt(secret)
    assert encrypted != secret
    decrypted = credential_service.decrypt(encrypted)
    assert decrypted == secret
