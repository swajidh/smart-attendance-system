from __future__ import annotations

import datetime
import logging

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pythonjsonlogger import jsonlogger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.api.v1.router import v1_router
from app.config import settings
from app.middleware.request_id import RequestIdMiddleware
from app.schemas.common import ApiResponse
from app.utils.exceptions import AppException


def _configure_logging() -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)

    handler = logging.StreamHandler()

    def _utc_asctime(timestamp: float, _tz=None):  # type: ignore[no-untyped-def]
        dt = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
        return dt.timetuple()

    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(endpoint)s %(method)s %(duration_ms)s %(user_id)s %(error)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    formatter.converter = _utc_asctime
    handler.setFormatter(formatter)

    root_logger.handlers.clear()
    root_logger.addHandler(handler)


def create_app() -> FastAPI:
    _configure_logging()
    app = FastAPI(
        title="Smart Attendance Backend",
        version="0.1.0",
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    )

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=ApiResponse[None](
                success=False,
                error="Validation failed",
                code="VALIDATION_ERROR",
                details=str(exc.errors()),
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse[None](
                success=False,
                error=exc.message,
                code=exc.code,
                details=exc.detail,
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=ApiResponse[None](
                success=False,
                error="An unexpected error occurred",
                code="INTERNAL_ERROR",
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    async def readiness(db: AsyncSession = Depends(get_db)):
        try:
            await db.execute(text("SELECT 1"))
            return {"status": "ready", "db": "ok"}
        except Exception:
            return JSONResponse(status_code=503, content={"status": "unavailable", "db": "error"})

    app.include_router(v1_router)
    return app


app = create_app()
