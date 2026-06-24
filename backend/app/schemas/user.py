import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    role: UserRole
    avatar_url: str | None = None
    bio: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None


class RoleUpdate(BaseModel):
    role: UserRole


class AvatarResponse(BaseModel):
    avatar_url: str
