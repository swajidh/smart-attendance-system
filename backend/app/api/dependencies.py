from typing import AsyncGenerator, Callable
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models import get_db
from app.models.user import User, UserRole
from app.core.permissions import Permission, user_has_permission, roles_with_permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session."""
    async for session in get_db():
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """Decode JWT and return the authenticated User or raise 401."""
    from app.services.auth_service import is_token_blacklisted

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if is_token_blacklisted(token):
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_role(*roles: UserRole) -> Callable:
    """Return a FastAPI dependency that checks the current user's role."""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to roles: {[r.value for r in roles]}",
            )
        return current_user

    return role_checker


def require_permission(permission: Permission) -> Callable:
    """Return a FastAPI dependency that checks a canonical permission."""

    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not user_has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value}",
            )
        return current_user

    return permission_checker


# Convenience role dependencies
require_admin = require_role(UserRole.admin)
require_admin_or_teacher = require_role(UserRole.admin, UserRole.teacher)
require_admin_teacher_or_counselor = require_role(
    UserRole.admin, UserRole.teacher, UserRole.counselor
)

# Permission-based dependencies (canonical matrix)
require_live_sessions = require_permission(Permission.live_sessions)
require_attendance_override = require_permission(Permission.attendance_override)
require_sessions_read = require_permission(Permission.sessions_read)
require_manage_students = require_permission(Permission.manage_students)
require_students_read = require_permission(Permission.students_read)
require_manage_courses = require_permission(Permission.manage_courses)
require_courses_read = require_permission(Permission.courses_read)
require_alerts = require_permission(Permission.alerts)
require_reports_read = require_permission(Permission.reports_read)
require_export_reports = require_permission(Permission.export_reports)
require_attention_read = require_permission(Permission.attention_read)
require_system_admin = require_permission(Permission.system_admin)
require_batches_read = require_permission(Permission.batches_read)
require_batches_manage = require_permission(Permission.batches_manage)
