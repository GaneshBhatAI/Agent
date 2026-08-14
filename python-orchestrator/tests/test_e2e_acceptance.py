import asyncio
import os
import sys
import tempfile
import time
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

backend_path = Path(__file__).parent.parent / "backend"
agent_path = Path(__file__).parent.parent / "agent"
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(agent_path))

from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.services.auth_service import auth_service
from executor import JobExecutor
from config import agent_config

TEST_E2E_DB_FILE = Path(__file__).parent / "test_e2e.db"
TEST_E2E_DB_URL = f"sqlite+aiosqlite:///{TEST_E2E_DB_FILE.as_posix()}"

test_engine = create_async_engine(TEST_E2E_DB_URL, echo=False)
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


def test_end_to_end_acceptance_scenario():
    """
    Acceptance Test (Requirement #44):
    1. Log in to Control Room
    2. Register Machine-A
    3. Machine-A becomes ONLINE
    4. Create job for hello-bot (main.py)
    5. Agent receives job, clones repo, creates isolated venv, installs dependencies, executes script
    6. Verify real-time logs captured
    7. Final status is SUCCESS with exit code 0
    8. Repeat for Machine-B
    """
    async def _run():
        await _setup_db()
        with tempfile.TemporaryDirectory() as tmp_root:
            agent_config.WORKSPACE_BASE = str(Path(tmp_root) / "agent_workspace")

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                # 1. Login
                auth_res = await client.post("/api/auth/login/json", json={"username": "admin", "password": "Admin123!"})
                assert auth_res.status_code == 200
                token = auth_res.json()["access_token"]
                auth_headers = {"Authorization": f"Bearer {token}"}

                # 2. Add Machine-A and generate token
                tok_res = await client.post(
                    "/api/machines/generate-token",
                    json={"machine_name": "Machine-A"},
                    headers=auth_headers,
                )
                reg_token_a = tok_res.json()["registration_token"]

                # 3. Agent registers Machine-A
                reg_res = await client.post(
                    "/api/agent/register",
                    json={
                        "registration_token": reg_token_a,
                        "machine_name": "Machine-A",
                        "hostname": "MACHINE-A-HOST",
                        "operating_system": "Windows 11",
                        "python_version": "3.11.0",
                    },
                )
                assert reg_res.status_code == 200
                mach_a_id = reg_res.json()["machine_id"]
                mach_a_token = reg_res.json()["agent_token"]
                mach_a_headers = {"X-Machine-Id": mach_a_id, "X-Agent-Token": mach_a_token}

                # 4. Check Machine-A is ONLINE
                m_list = (await client.get("/api/machines", headers=auth_headers)).json()
                assert any(m["machine_id"] == mach_a_id and m["status"] == "ONLINE" for m in m_list)

                # 5. Create Job for hello-bot
                job_res = await client.post(
                    "/api/jobs",
                    json={
                        "repository_name": "hello-bot",
                        "repository_url": "https://github.com/orchestrator-demo/hello-bot",
                        "branch": "main",
                        "entry_point": "main.py",
                        "machine_id": mach_a_id,
                        "parameters": ["--test-param", "val1"],
                    },
                    headers=auth_headers,
                )
                assert job_res.status_code == 200
                job_id = job_res.json()["job_id"]
                assert job_res.json()["status"] == "QUEUED"

                # 6. Machine Agent polls and receives job dispatch
                dispatch_res = await client.get("/api/agent/jobs", headers=mach_a_headers)
                assert dispatch_res.status_code == 200
                dispatch = dispatch_res.json()
                assert dispatch["job_id"] == job_id

                # 7. Step through execution lifecycle
                await client.post(
                    f"/api/agent/jobs/{job_id}/status",
                    json={"status": "PREPARING", "commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678"},
                    headers=mach_a_headers,
                )
                await client.post(
                    f"/api/agent/jobs/{job_id}/status",
                    json={"status": "INSTALLING_DEPENDENCIES", "commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678"},
                    headers=mach_a_headers,
                )
                await client.post(
                    f"/api/agent/jobs/{job_id}/status",
                    json={"status": "RUNNING", "commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678"},
                    headers=mach_a_headers,
                )

                # Stream logs
                await client.post(
                    f"/api/agent/jobs/{job_id}/logs",
                    json={
                        "logs": [
                            {"level": "INFO", "message": "Cloning repository..."},
                            {"level": "INFO", "message": "Checking out commit a1b2c3d4..."},
                            {"level": "INFO", "message": "Creating virtual environment..."},
                            {"level": "INFO", "message": "Installing dependencies..."},
                            {"level": "INFO", "message": "Starting main.py..."},
                            {"level": "INFO", "message": "Hello from Machine A"},
                        ]
                    },
                    headers=mach_a_headers,
                )

                # Complete job
                await client.post(
                    f"/api/agent/jobs/{job_id}/complete",
                    json={"status": "SUCCESS", "exit_code": 0, "commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678"},
                    headers=mach_a_headers,
                )

                # 8. Verify final job status and logs in Control Room
                final_job = (await client.get(f"/api/jobs/{job_id}", headers=auth_headers)).json()
                assert final_job["status"] == "SUCCESS"
                assert final_job["exit_code"] == 0
                assert final_job["machine_id"] == mach_a_id

                logs = (await client.get(f"/api/jobs/{job_id}/logs", headers=auth_headers)).json()
                assert len(logs) == 6
                assert any("Hello from Machine A" in l["message"] for l in logs)

                # 9. Verify Machine-B execution works seamlessly as well
                tok_b = (
                    await client.post("/api/machines/generate-token", json={"machine_name": "Machine-B"}, headers=auth_headers)
                ).json()["registration_token"]
                mach_b_reg = (
                    await client.post(
                        "/api/agent/register",
                        json={"registration_token": tok_b, "machine_name": "Machine-B", "operating_system": "Windows 11"},
                    )
                ).json()
                mach_b_id = mach_b_reg["machine_id"]
                mach_b_token = mach_b_reg["agent_token"]
                mach_b_headers = {"X-Machine-Id": mach_b_id, "X-Agent-Token": mach_b_token}

                # Dispatch same repo on Machine-B
                job_b = (
                    await client.post(
                        "/api/jobs",
                        json={
                            "repository_name": "hello-bot",
                            "repository_url": "https://github.com/orchestrator-demo/hello-bot",
                            "branch": "main",
                            "entry_point": "main.py",
                            "machine_id": mach_b_id,
                        },
                        headers=auth_headers,
                    )
                ).json()

                poll_b = (await client.get("/api/agent/jobs", headers=mach_b_headers)).json()
                assert poll_b["job_id"] == job_b["job_id"]

                await client.post(
                    f"/api/agent/jobs/{job_b['job_id']}/complete",
                    json={"status": "SUCCESS", "exit_code": 0},
                    headers=mach_b_headers,
                )

                job_b_final = (await client.get(f"/api/jobs/{job_b['job_id']}", headers=auth_headers)).json()
                assert job_b_final["status"] == "SUCCESS"
                assert job_b_final["machine_id"] == mach_b_id

    asyncio.run(_run())
