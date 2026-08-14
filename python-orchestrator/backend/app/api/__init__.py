from app.api.auth import router as auth_router
from app.api.github import router as github_router
from app.api.machines import router as machines_router
from app.api.jobs import router as jobs_router
from app.api.logs import router as logs_router
from app.api.schedules import router as schedules_router
from app.api.agent import router as agent_router
from app.api.credentials import router as credentials_router
from app.api.audit import router as audit_router
from app.api.dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "github_router",
    "machines_router",
    "jobs_router",
    "logs_router",
    "schedules_router",
    "agent_router",
    "credentials_router",
    "audit_router",
    "dashboard_router",
]
