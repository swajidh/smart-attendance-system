from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.schemas.health import HealthData
from app.utils.exceptions import AppException


class HealthService:
    async def check(self, db: AsyncSession) -> HealthData:
        settings = get_settings()
        try:
            await db.execute(text("SELECT 1"))
            database = "ok"
        except Exception as exc:
            raise AppException(
                status_code=503,
                message="Database unavailable",
                code="DATABASE_UNAVAILABLE",
                detail=str(exc),
            ) from exc

        return HealthData(status="ok", app_env=settings.APP_ENV, database=database)
