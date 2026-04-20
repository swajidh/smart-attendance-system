from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.attendance_log import AttendanceLog
from app.models.student import Student
from app.schemas.attendance import AttendanceTodayItem, AttendanceTodayResponse, MarkAttendanceResponse
from app.utils.exceptions import AppException


class AttendanceService:
    async def mark_attendance(
        self,
        *,
        db: AsyncSession,
        student_id: str,
        marked_at: datetime | None,
    ) -> MarkAttendanceResponse:
        mark_ts = marked_at or datetime.now(timezone.utc)
        if mark_ts.tzinfo is None:
            mark_ts = mark_ts.replace(tzinfo=timezone.utc)

        result = await db.execute(select(Student).where(Student.student_id == student_id))
        student = result.scalars().first()
        if student is None:
            raise AppException(
                status_code=404,
                message="Student not found",
                code="STUDENT_NOT_FOUND",
                detail=f"student_id={student_id}",
            )

        cutoff = mark_ts - timedelta(minutes=settings.ATTENDANCE_DEDUPE_MINUTES)
        recent_result = await db.execute(
            select(AttendanceLog)
            .where(AttendanceLog.student_id == student.id)
            .where(AttendanceLog.marked_at >= cutoff)
            .order_by(AttendanceLog.marked_at.desc())
        )
        recent = recent_result.scalars().first()
        if recent is not None:
            return MarkAttendanceResponse(
                student_id=student.student_id,
                marked_at=recent.marked_at,
                already_marked=True,
            )

        log = AttendanceLog(student_id=student.id, marked_at=mark_ts)
        db.add(log)
        await db.flush()

        return MarkAttendanceResponse(
            student_id=student.student_id,
            marked_at=log.marked_at,
            already_marked=False,
        )

    async def list_today(self, *, db: AsyncSession) -> AttendanceTodayResponse:
        now = datetime.now(timezone.utc)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        result = await db.execute(
            select(AttendanceLog, Student)
            .join(Student, AttendanceLog.student_id == Student.id)
            .where(AttendanceLog.marked_at >= start_of_day)
            .where(AttendanceLog.marked_at < end_of_day)
            .order_by(AttendanceLog.marked_at.desc())
        )
        rows = result.all()

        latest_by_student: dict[str, AttendanceTodayItem] = {}
        for log, student in rows:
            if student.student_id in latest_by_student:
                continue
            latest_by_student[student.student_id] = AttendanceTodayItem(
                student_id=student.student_id,
                name=student.name,
                marked_at=log.marked_at,
            )

        items = list(latest_by_student.values())
        items.sort(key=lambda item: item.marked_at, reverse=True)
        return AttendanceTodayResponse(items=items)


attendance_service = AttendanceService()
