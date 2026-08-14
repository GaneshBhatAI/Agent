from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api import (
    agent_router,
    audit_router,
    auth_router,
    credentials_router,
    dashboard_router,
    github_router,
    jobs_router,
    logs_router,
    machines_router,
    schedules_router,
)
from app.config import settings
from app.database import AsyncSessionLocal, init_db
from app.models.user import User, UserRole
from app.services.auth_service import auth_service
from app.services.scheduler_service import scheduler_service
from app.websocket.manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("orchestrator")


async def create_initial_admin():
    """Seed initial administrator account if no users exist"""
    async with AsyncSessionLocal() as db:
        query = select(User).where(User.username == settings.INITIAL_ADMIN_USERNAME)
        result = await db.execute(query)
        if not result.scalar_one_or_none():
            admin_user = User(
                username=settings.INITIAL_ADMIN_USERNAME,
                email=settings.INITIAL_ADMIN_EMAIL,
                password_hash=auth_service.get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin_user)
            await db.commit()
            logger.info(f"Initialized default admin account: '{settings.INITIAL_ADMIN_USERNAME}'")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Orchestrator Database and Services...")
    await init_db()
    await create_initial_admin()
    scheduler_service.start()
    await scheduler_service.load_all_schedules()
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} ready.")
    yield
    # Shutdown
    logger.info("Shutting down Orchestrator services...")
    scheduler_service.shutdown()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Central Control Room API for Python GitHub Orchestrator",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(github_router)
app.include_router(machines_router)
app.include_router(jobs_router)
app.include_router(logs_router)
app.include_router(schedules_router)
app.include_router(agent_router)
app.include_router(credentials_router)
app.include_router(audit_router)
app.include_router(dashboard_router)


# Health Checks
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# WebSockets
@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_logs(websocket: WebSocket, job_id: str):
    await ws_manager.connect_job(job_id, websocket)
    try:
        while True:
            # Keep-alive receive loop
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_job(job_id, websocket)
    except Exception:
        ws_manager.disconnect_job(job_id, websocket)


@app.websocket("/ws/machines")
async def websocket_machines_stream(websocket: WebSocket):
    await ws_manager.connect_machines(websocket)
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_machines(websocket)
    except Exception:
        ws_manager.disconnect_machines(websocket)


@app.websocket("/ws/global")
async def websocket_global_stream(websocket: WebSocket):
    await ws_manager.connect_global(websocket)
    try:
        while True:
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)
