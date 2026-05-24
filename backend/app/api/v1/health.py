from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import ApiResponse
from app.schemas.health import HealthData
from app.services.health_service import HealthService
from app.utils.responses import success_response

router = APIRouter(tags=["health"])
health_service = HealthService()


@router.get("/health", response_model=ApiResponse[HealthData])
async def health_check(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ApiResponse[HealthData]:
    data = await health_service.check(db)
    return success_response(request, data)
