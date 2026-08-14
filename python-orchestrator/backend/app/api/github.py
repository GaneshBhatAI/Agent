from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.credential import Credential, CredentialType
from app.models.user import User
from app.schemas.repository import (
    ConnectTokenRequest,
    GitHubBranchItem,
    GitHubCommitItem,
    GitHubFileItem,
    GitHubRepoItem,
)
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service
from app.services.credential_service import credential_service
from app.services.github_service import github_service

router = APIRouter(prefix="/api/github", tags=["GitHub"])


async def _get_active_github_token(db: AsyncSession) -> Optional[str]:
    query = (
        select(Credential)
        .where(Credential.credential_type == CredentialType.GITHUB_PAT)
        .order_by(Credential.created_at.desc())
        .limit(1)
    )
    result = await db.execute(query)
    cred = result.scalar_one_or_none()
    if cred:
        return credential_service.decrypt(cred.encrypted_value)
    return None


@router.get("/repositories", response_model=List[GitHubRepoItem])
async def list_repositories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    token = await _get_active_github_token(db)
    return await github_service.list_repositories(token)


@router.get("/repositories/{owner}/{repo}/branches", response_model=List[GitHubBranchItem])
async def list_branches(
    owner: str,
    repo: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    token = await _get_active_github_token(db)
    return await github_service.list_branches(owner, repo, token)


@router.get("/repositories/{owner}/{repo}/files", response_model=List[GitHubFileItem])
async def list_files(
    owner: str,
    repo: str,
    branch: str = Query("main", description="Git branch name"),
    path: str = Query("", description="Directory path inside repository"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    token = await _get_active_github_token(db)
    return await github_service.list_files(owner, repo, branch, path, token)


@router.get("/repositories/{owner}/{repo}/commits", response_model=List[GitHubCommitItem])
async def list_commits(
    owner: str,
    repo: str,
    branch: str = Query("main", description="Git branch name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    token = await _get_active_github_token(db)
    return await github_service.get_commits(owner, repo, branch, token)


@router.post("/connect-token")
async def connect_github_token(
    req: ConnectTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    encrypted_val = credential_service.encrypt(req.token)
    cred = Credential(
        name=req.name or "GitHub Personal Access Token",
        credential_type=CredentialType.GITHUB_PAT,
        encrypted_value=encrypted_val,
        description="Connected GitHub Token for Repository Discovery",
        created_by=current_user.username,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    await audit_service.log_action(
        db,
        action="GITHUB_CONNECTED",
        resource="credential",
        resource_id=str(cred.id),
        user=current_user,
        details={"name": cred.name},
    )

    return {"status": "success", "message": "GitHub token connected securely"}
