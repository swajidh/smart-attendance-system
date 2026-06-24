import os
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.dependencies import get_db_session, get_current_user, require_admin
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    StaffRegisterRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.user import UserResponse, UserUpdate, RoleUpdate, AvatarResponse
from app.services import auth_service
from app.config import settings

router = APIRouter()

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB
MAX_SIS_CSV_BYTES = 5 * 1024 * 1024  # 5 MB

# Rate limiter (gracefully absent if slowapi not installed)
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    _limiter = Limiter(key_func=get_remote_address)
    _rate_limit = _limiter.limit
except ImportError:
    def _rate_limit(limit_string):
        def decorator(func):
            return func
        return decorator


# ── Register ──────────────────────────────────────────────────────────────────

async def _create_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    name: str,
    role: UserRole,
) -> User:
    existing = await auth_service.get_user_by_email(db, email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=email,
        password_hash=auth_service.hash_password(password),
        name=name,
        role=role,
    )
    db.add(user)
    await db.flush()

    if user.role == UserRole.student:
        from app.services import student_service
        await student_service.link_user_to_student(db, user)

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@_rate_limit("20/minute")
async def register(
    request: Request,
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Student self-registration only."""
    if payload.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student registration only. Staff accounts use /auth/register/staff.",
        )

    return await _create_user(
        db,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role=UserRole.student,
    )


@router.post("/register/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@_rate_limit("10/minute")
async def register_staff(
    request: Request,
    payload: StaffRegisterRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Staff self-registration for admin, teacher, and counselor roles."""
    if payload.staff_key != settings.STAFF_REGISTRATION_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid staff registration key",
        )

    return await _create_user(
        db,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role=payload.role,
    )


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@_rate_limit("10/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Authenticate with email + password, return JWT."""
    user = await auth_service.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.role == UserRole.student:
        from app.services import student_service
        await student_service.link_user_to_student(db, user)

    token = auth_service.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Invalidate the current JWT (adds to in-process blacklist)."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):]
        auth_service.blacklist_token(token)


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update the authenticated user's name and/or bio."""
    if payload.name is not None:
        current_user.name = payload.name
    if payload.bio is not None:
        current_user.bio = payload.bio

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me/avatar", response_model=AvatarResponse)
async def update_avatar(
    avatar: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Upload and replace the authenticated user's profile picture."""
    if avatar.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP images are allowed")

    contents = await avatar.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Avatar must be under 2 MB")

    # Save to uploads/avatars/<user_id>.<ext>
    ext = avatar.filename.rsplit(".", 1)[-1].lower() if "." in avatar.filename else "jpg"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{current_user.id}.{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.add(current_user)
    await db.commit()

    return AvatarResponse(avatar_url=avatar_url)


# ── Password reset ────────────────────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Send a password-reset email.
    Always returns 202 (even if email not found) to prevent enumeration.
    """
    user = await auth_service.get_user_by_email(db, payload.email)
    if user:
        token = auth_service.generate_reset_token(payload.email)
        await auth_service.send_reset_email(payload.email, token)
    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Validate reset token and set a new password."""
    email = auth_service.verify_reset_token(payload.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = await auth_service.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = auth_service.hash_password(payload.new_password)
    db.add(user)
    await db.commit()
    auth_service.consume_reset_token(payload.token)

    return {"message": "Password updated successfully"}


# ── Admin user management ─────────────────────────────────────────────────────

@router.get("/admin/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db_session),
    _admin: User = Depends(require_admin),
):
    """List all users. Admin only."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.put("/admin/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    payload: RoleUpdate,
    db: AsyncSession = Depends(get_db_session),
    _admin: User = Depends(require_admin),
):
    """Change a user's role. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = payload.role
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
