from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.schemas.attendance import AttendanceTodayResponse, MarkAttendanceRequest, MarkAttendanceResponse
from app.schemas.common import ApiResponse
from app.schemas.student import StudentResponse
from app.services.attendance_service import attendance_service
from app.services.student_service import student_service

v1_router = APIRouter(prefix="/api/v1")


@v1_router.get("/ping", response_model=ApiResponse[dict[str, str]])
async def ping(request: Request) -> ApiResponse[dict[str, str]]:
    return ApiResponse(
        success=True,
        data={"message": "pong"},
        request_id=getattr(request.state, "request_id", None),
    )


@v1_router.post("/register", response_model=ApiResponse[StudentResponse], status_code=201)
async def register_student(
    request: Request,
    student_id: str = Form(..., min_length=1, max_length=64),
    name: str = Form(..., min_length=1, max_length=255),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[StudentResponse]:
    student = await student_service.register_student(
        db=db,
        student_id=student_id,
        name=name,
        image_file=image,
    )
    return ApiResponse(success=True, data=student, request_id=getattr(request.state, "request_id", None))


@v1_router.post("/mark-attendance", response_model=ApiResponse[MarkAttendanceResponse], status_code=200)
async def mark_attendance(
    request: Request,
    body: MarkAttendanceRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[MarkAttendanceResponse]:
    result = await attendance_service.mark_attendance(
        db=db,
        student_id=body.student_id,
        marked_at=body.marked_at,
    )
    return ApiResponse(success=True, data=result, request_id=getattr(request.state, "request_id", None))


@v1_router.get("/attendance/today", response_model=ApiResponse[AttendanceTodayResponse], status_code=200)
async def attendance_today(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[AttendanceTodayResponse]:
    result = await attendance_service.list_today(db=db)
    return ApiResponse(success=True, data=result, request_id=getattr(request.state, "request_id", None))
