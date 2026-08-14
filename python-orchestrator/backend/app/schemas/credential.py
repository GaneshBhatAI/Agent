from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.credential import CredentialType


class CredentialCreate(BaseModel):
    name: str
    credential_type: CredentialType = CredentialType.GITHUB_PAT
    value: str  # Plaintext in request, encrypted before DB save
    description: Optional[str] = None


class CredentialResponse(BaseModel):
    id: int
    name: str
    credential_type: CredentialType
    description: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
