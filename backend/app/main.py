import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.router import api_router
from app.limiter import limiter
from app.config import get_settings
from app.db.session import async_session_factory
from app.middleware.request_id import RequestIDMiddleware
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService
from app.utils.exceptions import AppException

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.is_development:
        async with async_session_factory() as session:
            await AuthService().ensure_seed_admin(session)
            await session.commit()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Smart Attendance API", version="0.1.0", lifespan=lifespan)
    app.state.limiter = limiter

    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    if settings.RATE_LIMIT_ENABLED:
        app.add_middleware(SlowAPIMiddleware)

    app.include_router(api_router)
    _register_exception_handlers(app)
    return app


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=ApiResponse(
                success=False,
                error="Validation failed",
                code="VALIDATION_ERROR",
                details=str(exc.errors()),
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.error(
            "AppException",
            extra={"code": exc.code, "request_id": getattr(request.state, "request_id", None)},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse(
                success=False,
                error=exc.message,
                code=exc.code,
                details=exc.detail,
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        response = JSONResponse(
            status_code=429,
            content=ApiResponse(
                success=False,
                error="Rate limit exceeded",
                code="RATE_LIMIT_EXCEEDED",
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )
        response.headers["Retry-After"] = "60"
        return response

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Unhandled exception",
            extra={"request_id": getattr(request.state, "request_id", None)},
        )
        return JSONResponse(
            status_code=500,
            content=ApiResponse(
                success=False,
                error="An unexpected error occurred",
                code="INTERNAL_ERROR",
                request_id=getattr(request.state, "request_id", None),
            ).model_dump(),
        )

app = create_app()
