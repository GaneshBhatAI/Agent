import enum
from typing import Optional
from sqlalchemy import Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, TimestampMixin


class CredentialType(str, enum.Enum):
    GITHUB_PAT = "GITHUB_PAT"
    GITHUB_APP = "GITHUB_APP"
    API_KEY = "API_KEY"
    GENERIC_SECRET = "GENERIC_SECRET"


class Credential(Base, TimestampMixin):
    __tablename__ = "credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    credential_type: Mapped[CredentialType] = mapped_column(
        Enum(CredentialType), default=CredentialType.GITHUB_PAT, nullable=False
    )
    encrypted_value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_by: Mapped[str] = mapped_column(String(100), default="admin", nullable=False)
