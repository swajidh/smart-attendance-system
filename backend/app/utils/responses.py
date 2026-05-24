from typing import TypeVar

from fastapi import Request

from app.schemas.common import ApiResponse

T = TypeVar("T")


def success_response(request: Request, data: T) -> ApiResponse[T]:
    return ApiResponse(success=True, data=data, request_id=getattr(request.state, "request_id", None))
