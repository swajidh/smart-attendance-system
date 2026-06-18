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


# Convenience role dependencies
require_admin = require_role(UserRole.admin)
require_admin_or_teacher = require_role(UserRole.admin, UserRole.teacher)
require_admin_teacher_or_counselor = require_role(
    UserRole.admin, UserRole.teacher, UserRole.counselor
)
