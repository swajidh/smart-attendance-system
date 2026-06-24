from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.student

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class StaffRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole
    staff_key: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("role")
    @classmethod
    def staff_role_only(cls, v: UserRole) -> UserRole:
        if v not in (UserRole.admin, UserRole.teacher, UserRole.counselor):
            raise ValueError("Staff registration supports admin, teacher, or counselor only")
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# imported below to avoid circular reference
from app.schemas.user import UserResponse  # noqa: E402
TokenResponse.model_rebuild()
