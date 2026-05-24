from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.attendance import (
    AttendanceRecordResponse,
    CreateSessionRequest,
    MarkAttendanceRequest,
    SessionResponse,
)
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.services.attendance_service import AttendanceService
from app.utils.responses import success_response

router = APIRouter(prefix="/attendance", tags=["attendance"])
attendance_service = AttendanceService()


@router.post("/sessions", response_model=ApiResponse[SessionResponse], status_code=status.HTTP_201_CREATED)
async def create_session(
    request: Request,
    body: CreateSessionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ApiResponse[SessionResponse]:
    session = await attendance_service.create_session(db, teacher=current_user, body=body)
    return success_response(request, session)


@router.post("/sessions/{session_id}/close", response_model=ApiResponse[SessionResponse])
async def close_session(
    request: Request,
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ApiResponse[SessionResponse]:
    session = await attendance_service.close_session(db, teacher=current_user, session_id=session_id)
    return success_response(request, session)


@router.post(
    "/sessions/{session_id}/mark",
    response_model=ApiResponse[AttendanceRecordResponse],
    status_code=status.HTTP_201_CREATED,
)
async def mark_attendance(
    request: Request,
    session_id: UUID,
    body: MarkAttendanceRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ApiResponse[AttendanceRecordResponse]:
    record = await attendance_service.mark_attendance(
        db, actor=current_user, session_id=session_id, body=body
    )
    return success_response(request, record)


@router.get(
    "/sessions/{session_id}/records",
    response_model=PaginatedResponse[AttendanceRecordResponse],
)
async def list_records(
    request: Request,
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[AttendanceRecordResponse]:
    records, meta = await attendance_service.list_records(
        db, session_id=session_id, page=page, limit=limit
    )
    return PaginatedResponse(
        success=True,
        data=records,
        meta=meta,
        request_id=getattr(request.state, "request_id", None),
    )
