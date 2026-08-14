from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.credential import Credential
from app.models.user import User, UserRole
from app.schemas.credential import CredentialCreate, CredentialResponse
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service
from app.services.credential_service import credential_service

router = APIRouter(prefix="/api/credentials", tags=["Credentials"])


@router.get("", response_model=List[CredentialResponse])
async def list_credentials(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN, UserRole.OPERATOR])),
):
    query = select(Credential).order_by(Credential.name.asc())
    result = await db.execute(query)
    credentials = result.scalars().all()
    return [CredentialResponse.model_validate(c) for c in credentials]


@router.post("", response_model=CredentialResponse)
async def create_credential(
    req: CredentialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN])),
):
    query = select(Credential).where(Credential.name == req.name)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Credential '{req.name}' already exists",
        )

    encrypted = credential_service.encrypt(req.value)
    cred = Credential(
        name=req.name,
        credential_type=req.credential_type,
        encrypted_value=encrypted,
        description=req.description,
        created_by=current_user.username,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    await audit_service.log_action(
        db,
        action="CREDENTIAL_CREATED",
        resource="credential",
        resource_id=str(cred.id),
        user=current_user,
        details={"name": cred.name, "type": cred.credential_type.value},
    )

    return CredentialResponse.model_validate(cred)


@router.delete("/{credential_id}")
async def delete_credential(
    credential_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN])),
):
    query = select(Credential).where(Credential.id == credential_id)
    result = await db.execute(query)
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    await db.delete(cred)
    await db.commit()

    await audit_service.log_action(
        db,
        action="CREDENTIAL_DELETED",
        resource="credential",
        resource_id=str(credential_id),
        user=current_user,
    )

    return {"status": "success", "message": f"Credential {credential_id} removed"}
