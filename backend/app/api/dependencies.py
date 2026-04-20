from __future__ import annotations

from typing import AsyncGenerator

from fastapi import Header
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.utils.exceptions import AppException

engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def require_auth(authorization: str | None = Header(default=None, alias="Authorization")) -> str:
    if not authorization:
        raise AppException(status_code=401, message="Unauthorized", code="UNAUTHORIZED")
    return authorization
