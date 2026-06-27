"""
Student Personal Portal — read-only, strictly own-data endpoints.

All routes require the `student` role and are scoped to the JWT caller's
linked Student record (via Student.user_id). No cross-student access is
possible: every query filters on the resolved student_id.

GET  /portal/me          — own profile
GET  /portal/attendance  — attendance records + monthly % breakdown
GET  /portal/attention   — attention trends (weekly + per-session avg)
GET  /portal/courses     — enrolled courses with attendance stats
"""

from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_db_session, get_current_user, require_role
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.course import Course
from app.models.course_student import CourseStudent
from app.models.attendance import Attendance, AttendanceStatus
from app.models.attention_log import AttentionLog
from app.models.session import Session, SessionStatus
from app.services import student_service

router = APIRouter(prefix="/portal", tags=["portal"])

_STUDENT = [Depends(require_role(UserRole.student))]


def _normalize_overall(pct_data: dict) -> dict:
    """Map report_service field names to portal frontend expectations."""
    per_course = []
    for c in pct_data.get("per_course", []):
        per_course.append({
            **c,
            "attendance_pct": c.get("attendance_pct", 0),
            "present_sessions": c.get("present", 0),
            "total_sessions": c.get("total", 0),
        })
    return {
        **pct_data,
        "overall_percentage": pct_data.get("overall_attendance_pct", 0.0),
        "overall_attendance_pct": pct_data.get("overall_attendance_pct", 0.0),
        "per_course": per_course,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helper — resolve JWT user → Student record
# ─────────────────────────────────────────────────────────────────────────────

async def _get_own_student(
    db: AsyncSession,
    current_user: User,
) -> Student:
    student = await student_service.link_user_to_student(db, current_user)
    if student:
        return student

    result = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=404,
            detail=(
                "No student record linked to your account. "
                "Ask an administrator to register you as a student using the same email, "
                "then sign in again."
            ),
        )
    return student


# ─────────────────────────────────────────────────────────────────────────────
# 9.1  GET /portal/me
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me", dependencies=_STUDENT)
async def portal_me(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Return own student profile."""
    student = await _get_own_student(db, current_user)
    from app.services import attention_aggregates as attn_agg
    overall_attn = await attn_agg.get_student_avg_attention(db, student.id)
    low_attention = overall_attn > 0 and overall_attn < attn_agg.ATTENTION_LOW_THRESHOLD
    return {
        "id": str(student.id),
        "student_id": student.student_id,
        "name": student.name,
        "email": student.email,
        "roll_no": student.roll_no,
        "department": student.department,
        "phone": student.phone,
        "embedding_status": student.embedding_status.value,
        "enrollment_date": student.enrollment_date.isoformat() if student.enrollment_date else None,
        "created_at": student.created_at.isoformat(),
        "overall_attention": overall_attn,
        "low_attention_warning": low_attention,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9.2  GET /portal/attendance
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/attendance", dependencies=_STUDENT)
async def portal_attendance(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Own attendance records plus:
    - cumulative percentage overall
    - per-course breakdown
    - monthly attendance counts (last 6 months)
    """
    student = await _get_own_student(db, current_user)
    sid = student.id

    # Reuse Phase 5 service
    from app.services.report_service import get_student_percentage
    pct_data = await get_student_percentage(db, sid)

    # Calendar + monthly: all sessions with attendance records (incl. active)
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    records_q = await db.execute(
        select(Attendance, Session)
        .join(Session, Attendance.session_id == Session.id)
        .where(
            Attendance.student_id == sid,
            Session.start_time >= cutoff,
        )
        .order_by(Session.start_time.desc())
    )
    records = records_q.all()

    calendar_data = [
        {
            "date": r.Session.start_time.isoformat(),
            "status": r.Attendance.status.value,
            "course_id": str(r.Session.course_id) if r.Session.course_id else None,
            "session_id": str(r.Session.id),
        }
        for r in records
    ]

    # Monthly breakdown (last 6 months)
    monthly: dict[str, dict] = {}
    for row in records:
        month = row.Session.start_time.strftime("%Y-%m")
        if month not in monthly:
            monthly[month] = {"month": month, "present": 0, "absent": 0, "total": 0}
        monthly[month]["total"] += 1
        if row.Attendance.status == AttendanceStatus.present:
            monthly[month]["present"] += 1
        else:
            monthly[month]["absent"] += 1

    monthly_list = sorted(monthly.values(), key=lambda x: x["month"])
    for m in monthly_list:
        m["attendance_pct"] = (
            round(m["present"] / m["total"] * 100, 1) if m["total"] else 0.0
        )

    return {
        "overall": _normalize_overall(pct_data),
        "calendar": calendar_data,
        "monthly": monthly_list,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9.3  GET /portal/attention
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/attention", dependencies=_STUDENT)
async def portal_attention(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Own attention data:
    - overall average score
    - weekly trend (last 8 weeks)
    - per-session averages (recent 20 sessions)
    """
    student = await _get_own_student(db, current_user)
    sid = student.id

    # Overall average
    overall_q = await db.execute(
        select(func.avg(AttentionLog.score))
        .join(Session, AttentionLog.session_id == Session.id)
        .where(
            AttentionLog.student_id == sid,
            Session.status.in_([SessionStatus.closed, SessionStatus.active]),
        )
    )
    overall_avg = round(float(overall_q.scalar() or 0), 1)

    # Weekly trend — last 8 weeks
    eight_weeks_ago = datetime.now(timezone.utc) - timedelta(weeks=8)
    weekly_q = await db.execute(
        select(
            func.date_trunc("week", AttentionLog.timestamp).label("week"),
            func.avg(AttentionLog.score).label("avg_score"),
            func.count(AttentionLog.id).label("samples"),
        )
        .join(Session, AttentionLog.session_id == Session.id)
        .where(
            AttentionLog.student_id == sid,
            AttentionLog.timestamp >= eight_weeks_ago,
            Session.status.in_([SessionStatus.closed, SessionStatus.active]),
        )
        .group_by("week")
        .order_by("week")
    )
    weekly = [
        {
            "week": row.week.strftime("%b %d") if row.week else "—",
            "avg_score": round(float(row.avg_score), 1),
            "samples": row.samples,
        }
        for row in weekly_q.all()
    ]

    # Per-session averages (recent 20)
    session_q = await db.execute(
        select(
            Session.id,
            Session.start_time,
            Course.name.label("course_name"),
            Course.code.label("course_code"),
            func.avg(AttentionLog.score).label("avg_score"),
        )
        .join(AttentionLog, AttentionLog.session_id == Session.id)
        .outerjoin(Course, Session.course_id == Course.id)
        .where(
            AttentionLog.student_id == sid,
            Session.status.in_([SessionStatus.closed, SessionStatus.active]),
        )
        .group_by(Session.id, Session.start_time, Course.name, Course.code)
        .order_by(Session.start_time.desc())
        .limit(20)
    )
    sessions = [
        {
            "session_id": str(row.id),
            "date": row.start_time.strftime("%Y-%m-%d") if row.start_time else None,
            "course_name": row.course_name or "Unknown",
            "course_code": row.course_code or "—",
            "avg_score": round(float(row.avg_score), 1),
        }
        for row in session_q.all()
    ]

    return {
        "overall_avg": overall_avg,
        "weekly_trend": weekly,
        "per_session": sessions,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 9.4  GET /portal/courses
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/courses", dependencies=_STUDENT)
async def portal_courses(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    Own enrolled courses with per-course attendance stats.
    """
    student = await _get_own_student(db, current_user)
    sid = student.id

    # Enrolled courses
    enrolled_q = await db.execute(
        select(Course)
        .join(CourseStudent, Course.id == CourseStudent.course_id)
        .where(CourseStudent.student_id == sid)
        .order_by(Course.code)
    )
    courses = enrolled_q.scalars().all()

    result = []
    for course in courses:
        # Total sessions for this course (active + closed)
        total_q = await db.execute(
            select(func.count(Session.id))
            .where(
                Session.course_id == course.id,
                Session.status.in_([SessionStatus.closed, SessionStatus.active]),
            )
        )
        total = total_q.scalar() or 0

        # Student's present count (includes active sessions)
        present_q = await db.execute(
            select(func.count(Attendance.id))
            .join(Session, Attendance.session_id == Session.id)
            .where(
                Attendance.student_id == sid,
                Session.course_id == course.id,
                Attendance.status == AttendanceStatus.present,
                Session.status.in_([SessionStatus.closed, SessionStatus.active]),
            )
        )
        present = present_q.scalar() or 0
        att_pct = round(present / total * 100, 1) if total else 0.0

        # Average attention for this course
        attn_q = await db.execute(
            select(func.avg(AttentionLog.score))
            .join(Session, AttentionLog.session_id == Session.id)
            .where(
                AttentionLog.student_id == sid,
                Session.course_id == course.id,
                Session.status.in_([SessionStatus.closed, SessionStatus.active]),
            )
        )
        avg_attention = round(float(attn_q.scalar() or 0), 1)

        result.append({
            "id": str(course.id),
            "code": course.code,
            "name": course.name,
            "description": course.description,
            "slots": course.slots or [],
            "total_sessions": total,
            "present": present,
            "absent": total - present,
            "attendance_pct": att_pct,
            "avg_attention": avg_attention,
        })

    return result
