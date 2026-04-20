from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("smart_attendance")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000.0
            logger.info(
                "request_completed",
                extra={
                    "request_id": request_id,
                    "endpoint": request.url.path,
                    "method": request.method,
                    "duration_ms": duration_ms,
                    "user_id": getattr(request.state, "user_id", None),
                    "error": None,
                },
            )
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000.0
            logger.error(
                "request_failed",
                extra={
                    "request_id": request_id,
                    "endpoint": request.url.path,
                    "method": request.method,
                    "duration_ms": duration_ms,
                    "user_id": getattr(request.state, "user_id", None),
                    "error": str(exc),
                },
            )
            raise
