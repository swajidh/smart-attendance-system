from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TokenPairResponse, UserResponse
from app.utils.exceptions import ForbiddenError, UnauthorizedError
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    async def login(self, db: AsyncSession, body: LoginRequest) -> TokenPairResponse:
        result = await db.execute(select(User).where(User.email == body.email, User.deleted_at.is_(None)))
        user = result.scalar_one_or_none()
        if user is None or not verify_password(body.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password", code="INVALID_CREDENTIALS")
        if not user.is_active:
            raise ForbiddenError("User account is inactive", code="USER_INACTIVE")

        access_token, expires_at = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        return TokenPairResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )

    async def refresh(self, db: AsyncSession, refresh_token: str) -> TokenPairResponse:
        try:
            user_id = decode_token(refresh_token, expected_type="refresh")
        except ValueError as exc:
            raise UnauthorizedError("Invalid refresh token", code="INVALID_REFRESH_TOKEN") from exc

        user = await self._get_active_user(db, user_id)
        access_token, expires_at = create_access_token(user.id)
        new_refresh = create_refresh_token(user.id)
        return TokenPairResponse(
            access_token=access_token,
            refresh_token=new_refresh,
            expires_at=expires_at,
        )

    async def get_user(self, db: AsyncSession, user_id: UUID) -> UserResponse:
        user = await self._get_active_user(db, user_id)
        return UserResponse.model_validate(user)

    async def _get_active_user(self, db: AsyncSession, user_id: UUID) -> User:
        result = await db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise UnauthorizedError("User not found", code="USER_NOT_FOUND")
        if not user.is_active:
            raise ForbiddenError("User account is inactive", code="USER_INACTIVE")
        return user

    async def ensure_seed_admin(self, db: AsyncSession) -> None:
        """Development helper: create default admin if no users exist."""
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none() is not None:
            return
        admin = User(
            email="admin@example.com",
            hashed_password=hash_password("ChangeMe123!"),
            full_name="System Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        await db.flush()
