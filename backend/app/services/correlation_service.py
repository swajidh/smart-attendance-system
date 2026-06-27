"""
Correlation service — cross-references attendance % with average attention score
to identify students where both metrics are low (double-risk), or where high
attendance masks low engagement (hidden disengagement).
"""

from __future__ import annotations
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.student import Student
from app.models.attendance import Attendance, AttendanceStatus
from app.models.attention_log import AttentionLog
from app.services import attention_aggregates as attn_agg
from app.models.session import Session, SessionStatus
from app.models.course_student import CourseStudent


async def get_student_correlation(
    db: AsyncSession, student_id: UUID
) -> dict:
    """
    Return attendance % + average attention score for one student,
    plus a correlation flag if both are low.
    """
    student_res = await db.execute(select(Student).where(Student.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        return {}

    total_q = await db.execute(
        select(func.count(Attendance.id))
        .join(Session, Attendance.session_id == Session.id)
        .where(
            Attendance.student_id == student_id,
            Session.status == SessionStatus.closed,
        )
    )
    present_q = await db.execute(
        select(func.count(Attendance.id))
        .join(Session, Attendance.session_id == Session.id)
        .where(
            Attendance.student_id == student_id,
            Attendance.status == AttendanceStatus.present,
            Session.status == SessionStatus.closed,
        )
    )
    total_sessions = total_q.scalar() or 0
    present_sessions = present_q.scalar() or 0
    attendance_pct = (
        round(present_sessions / total_sessions * 100, 1) if total_sessions else 0.0
    )

    # Attention
    avg_attention = await attn_agg.get_student_avg_attention(db, student_id)

    # Correlation flags
    att_low = attendance_pct < 75
    attn_low = avg_attention < 40 and total_sessions > 0
    correlation_flag = _classify_correlation(att_low, attn_low, attendance_pct, avg_attention)

    return {
        "student_id": str(student_id),
        "student_name": student.name,
        "roll_no": student.roll_no,
        "department": student.department,
        "attendance_pct": attendance_pct,
        "avg_attention": avg_attention,
        "total_sessions": total_sessions,
        "present_sessions": present_sessions,
        "correlation_flag": correlation_flag,
        "has_data": total_sessions > 0,
    }


async def get_batch_correlation(
    db: AsyncSession,
    department: Optional[str] = None,
    limit: int = 100,
    batch_id: Optional[UUID] = None,
    student_ids: Optional[list[UUID]] = None,
) -> list[dict]:
    """
    Return correlation data for students (optionally filtered by department or batch).
    Only students with ≥1 closed session are included.
    """
    q = select(Student)
    if batch_id:
        q = q.where(Student.batch_id == batch_id)
    elif student_ids is not None:
        if not student_ids:
            return []
        q = q.where(Student.id.in_(student_ids))
    if department:
        q = q.where(Student.department.ilike(f"%{department}%"))
    q = q.limit(limit)
    students = (await db.execute(q)).scalars().all()

    if not students:
        return []

    student_ids = [s.id for s in students]

    # Batch attendance counts
    total_res = await db.execute(
        select(
            Attendance.student_id,
            func.count(Attendance.id).label("total"),
        )
        .join(Session, Attendance.session_id == Session.id)
        .where(
            Attendance.student_id.in_(student_ids),
            Session.status == SessionStatus.closed,
        )
        .group_by(Attendance.student_id)
    )
    total_map = {str(r.student_id): r.total for r in total_res.all()}

    present_res = await db.execute(
        select(
            Attendance.student_id,
            func.count(Attendance.id).label("present"),
        )
        .join(Session, Attendance.session_id == Session.id)
        .where(
            Attendance.student_id.in_(student_ids),
            Attendance.status == AttendanceStatus.present,
            Session.status == SessionStatus.closed,
        )
        .group_by(Attendance.student_id)
    )
    present_map = {str(r.student_id): r.present for r in present_res.all()}

    # Batch attention averages
    attn_res = await db.execute(
        select(
            AttentionLog.student_id,
            func.avg(AttentionLog.score).label("avg_score"),
        )
        .join(Session, AttentionLog.session_id == Session.id)
        .where(
            AttentionLog.student_id.in_(student_ids),
            Session.status == SessionStatus.closed,
        )
        .group_by(AttentionLog.student_id)
    )
    attn_map = {str(r.student_id): round(float(r.avg_score), 1) for r in attn_res.all()}

    result = []
    for s in students:
        sid = str(s.id)
        total = total_map.get(sid, 0)
        if total == 0:
            continue  # skip students with no session data
        present = present_map.get(sid, 0)
        att_pct = round(present / total * 100, 1)
        avg_attn = attn_map.get(sid, 0.0)
        att_low = att_pct < 75
        attn_low = avg_attn < 40

        result.append(
            {
                "student_id": sid,
                "student_name": s.name,
                "roll_no": s.roll_no,
                "department": s.department,
                "attendance_pct": att_pct,
                "avg_attention": avg_attn,
                "total_sessions": total,
                "present_sessions": present,
                "correlation_flag": _classify_correlation(att_low, attn_low, att_pct, avg_attn),
                "has_data": True,
            }
        )

    return sorted(result, key=lambda x: (x["attendance_pct"] + x["avg_attention"]))


def _classify_correlation(
    att_low: bool, attn_low: bool,
    att_pct: float, avg_attn: float,
) -> str:
    """
    Classify the relationship between attendance and attention:
    - double_risk       : both low (most urgent)
    - hidden_disengagement: high attendance but low attention
    - poor_attendance   : low attendance, adequate attention
    - at_risk           : borderline on at least one metric
    - healthy           : both adequate
    """
    if att_low and attn_low:
        return "double_risk"
    if not att_low and attn_low:
        return "hidden_disengagement"
    if att_low and not attn_low:
        return "poor_attendance"
    if att_pct < 85 or avg_attn < 60:
        return "at_risk"
    return "healthy"
