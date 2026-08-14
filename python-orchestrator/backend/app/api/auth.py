from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import LoginRequest, Token, UserCreate, UserResponse
from app.services.audit_service import audit_service
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.username == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not auth_service.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    access_token = auth_service.create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )

    await audit_service.log_action(
        db,
        action="USER_LOGIN",
        resource="user",
        resource_id=str(user.id),
        user=user,
        details={"username": user.username},
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login/json", response_model=Token)
async def login_json(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.username == req.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not auth_service.verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    access_token = auth_service.create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(auth_service.get_current_user),
):
    return UserResponse.model_validate(current_user)


@router.post("/register", response_model=UserResponse)
async def register_user(
    req: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(auth_service.require_role([UserRole.ADMIN])),
):
    # Check if username or email already exists
    query = select(User).where((User.username == req.username) | (User.email == req.email))
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists",
        )

    hashed_pw = auth_service.get_password_hash(req.password)
    user = User(
        username=req.username,
        email=req.email,
        password_hash=hashed_pw,
        role=req.role,
        is_active=req.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await audit_service.log_action(
        db,
        action="USER_CREATED",
        resource="user",
        resource_id=str(user.id),
        user=current_user,
        details={"created_username": user.username, "role": user.role.value},
    )

    return UserResponse.model_validate(user)
