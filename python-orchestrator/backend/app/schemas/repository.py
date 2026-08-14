from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class RepositoryBase(BaseModel):
    github_owner: str
    repository_name: str
    repository_url: str
    default_branch: str = "main"
    description: Optional[str] = None
    is_private: bool = False


class RepositoryCreate(RepositoryBase):
    credential_id: Optional[int] = None


class RepositoryResponse(RepositoryBase):
    id: int
    credential_id: Optional[int] = None
    connected_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GitHubRepoItem(BaseModel):
    name: str
    full_name: str
    owner: str
    html_url: str
    description: Optional[str] = None
    default_branch: str = "main"
    private: bool = False
    language: Optional[str] = None
    updated_at: Optional[str] = None


class GitHubBranchItem(BaseModel):
    name: str
    commit_sha: str
    protected: bool = False


class GitHubFileItem(BaseModel):
    name: str
    path: str
    type: str  # "file" or "dir"
    size: Optional[int] = None
    is_python: bool = False
    is_dependency_file: bool = False  # requirements.txt, pyproject.toml, Pipfile
    children: Optional[List["GitHubFileItem"]] = None


class GitHubCommitItem(BaseModel):
    sha: str
    message: str
    author: str
    date: str
    url: Optional[str] = None


class ConnectTokenRequest(BaseModel):
    token: str
    name: Optional[str] = "GitHub Personal Access Token"
