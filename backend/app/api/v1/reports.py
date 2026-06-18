"""
Report & export endpoints.
All routes require authentication; export routes require lecturer or admin role.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, get_current_user, require_role
from app.models.user import User, UserRole
from app.services import report_service, export_service

router = APIRouter(prefix="/reports", tags=["reports"])

_AUTH = [Depends(get_current_user)]
_LECTURER = [Depends(require_role(UserRole.teacher, UserRole.admin))]


# ── 5.3 Summary ───────────────────────────────────────────────────────────────

@router.get("/attendance", dependencies=_AUTH)
async def attendance_summary(
    course_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db_session),
):
    return await report_service.get_attendance_summary(db, course_id, start_date, end_date)


@router.get("/attendance/student/{student_id}", dependencies=_AUTH)
async def student_attendance(
    student_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    return await report_service.get_student_percentage(db, student_id)


@router.get("/at-risk", dependencies=_AUTH)
async def at_risk_students(
    threshold: float = Query(75.0, ge=0, le=100),
    department: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session),
):
    return await report_service.get_at_risk_students(db, threshold, department)


@router.get("/trends", dependencies=_AUTH)
async def attendance_trends(
    course_id: Optional[UUID] = Query(None),
    period: str = Query("weekly", pattern="^(daily|weekly|monthly)$"),
    limit: int = Query(12, ge=1, le=52),
    db: AsyncSession = Depends(get_db_session),
):
    return await report_service.get_attendance_trends(db, course_id, period, limit)


@router.get("/last-seen", dependencies=_AUTH)
async def last_seen(
    session_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db_session),
):
    return await report_service.get_last_seen(db, session_id)


@router.get("/dashboard", dependencies=_AUTH)
async def dashboard_summary(db: AsyncSession = Depends(get_db_session)):
    return await report_service.get_dashboard_summary(db)


# ── 7.4 Correlation routes ────────────────────────────────────────────────────

@router.get("/correlation/student/{student_id}", dependencies=_AUTH)
async def student_correlation(
    student_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    from app.services.correlation_service import get_student_correlation
    return await get_student_correlation(db, student_id)


@router.get("/correlation/batch", dependencies=_AUTH)
async def batch_correlation(
    department: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db_session),
):
    from app.services.correlation_service import get_batch_correlation
    return await get_batch_correlation(db, department, limit)


# ── 5.3 Exports ───────────────────────────────────────────────────────────────

@router.get("/export/csv", dependencies=_LECTURER)
async def export_csv(
    course_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db_session),
):
    csv_bytes = await export_service.export_csv(db, course_id, start_date, end_date)
    filename = f"attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf", dependencies=_LECTURER)
async def export_pdf(
    course_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db_session),
):
    pdf_bytes = await export_service.export_pdf(db, course_id, start_date, end_date)
    filename = f"attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
