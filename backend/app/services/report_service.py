"""
Report service — analytics queries over persistent Attendance/Session data.
All functions return plain dicts/lists for easy JSON serialisation.
"""

from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_

from app.models.session import Session, SessionStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.course import Course
from app.models.course_student import CourseStudent
from app.models.student import Student


# ── 5.1 Attendance summary ────────────────────────────────────────────────────

async def get_attendance_summary(
    db: AsyncSession,
    course_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict:
    """
    Return aggregate stats across sessions matching the filters.
    Response shape:
        {
          total_sessions, avg_attendance_pct, total_present, total_absent,
          total_unknown, sessions: [{ id, session_id, course_name, start_time,
                                       total_enrolled, total_present, attendance_pct }]
        }
    """
    q = (
        select(Session, Course)
        .join(Course, Session.course_id == Course.id)
        .where(Session.status == SessionStatus.closed)
    )
    if course_id:
        q = q.where(Session.course_id == course_id)
    if start_date:
        q = q.where(Session.start_time >= start_date)
    if end_date:
        q = q.where(Session.start_time <= end_date)

    rows = (await db.execute(q.order_by(Session.start_time.desc()))).all()

    sessions_out = []
    total_present = 0
    total_absent = 0
    total_unknown = 0
    pct_sum = 0.0

    for session, course in rows:
        pct = (
            round(session.total_present / session.total_enrolled * 100, 1)
            if session.total_enrolled > 0
            else 0.0
        )
        pct_sum += pct
        total_present += session.total_present
        total_absent += session.total_absent
        total_unknown += session.total_unknown
        sessions_out.append(
            {
                "id": str(session.id),
                "session_id": session.session_id,
                "course_id": str(session.course_id),
                "course_name": course.name,
                "course_code": course.code,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "total_enrolled": session.total_enrolled,
                "total_present": session.total_present,
                "total_absent": session.total_absent,
                "total_unknown": session.total_unknown,
                "attendance_pct": pct,
            }
        )

    n = len(sessions_out)
    return {
        "total_sessions": n,
        "avg_attendance_pct": round(pct_sum / n, 1) if n else 0.0,
        "total_present": total_present,
        "total_absent": total_absent,
        "total_unknown": total_unknown,
        "sessions": sessions_out,
    }


# ── 5.2 Per-student attendance percentage ─────────────────────────────────────

async def get_student_percentage(db: AsyncSession, student_id: UUID) -> dict:
    """
    Overall + per-course attendance percentage for one student.
    Only closed sessions are counted.
    """
    student_res = await db.execute(select(Student).where(Student.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        return {}

    # Get all attendance records for this student in closed sessions
    q = (
        select(Attendance, Session, Course)
        .join(Session, Attendance.session_id == Session.id)
        .join(Course, Session.course_id == Course.id)
        .where(
            Attendance.student_id == student_id,
            Session.status == SessionStatus.closed,
        )
    )
    rows = (await db.execute(q)).all()

    # Group by course
    course_data: dict[str, dict] = {}
    for att, session, course in rows:
        cid = str(course.id)
        if cid not in course_data:
            course_data[cid] = {
                "course_id": cid,
                "course_code": course.code,
                "course_name": course.name,
                "total": 0,
                "present": 0,
            }
        course_data[cid]["total"] += 1
        if att.status == AttendanceStatus.present:
            course_data[cid]["present"] += 1

    per_course = []
    overall_total = 0
    overall_present = 0
    for cd in course_data.values():
        pct = round(cd["present"] / cd["total"] * 100, 1) if cd["total"] else 0.0
        per_course.append({**cd, "attendance_pct": pct})
        overall_total += cd["total"]
        overall_present += cd["present"]

    return {
        "student_id": str(student_id),
        "student_name": student.name,
        "roll_no": student.roll_no,
        "overall_attendance_pct": (
            round(overall_present / overall_total * 100, 1) if overall_total else 0.0
        ),
        "total_sessions": overall_total,
        "total_present": overall_present,
        "per_course": sorted(per_course, key=lambda x: x["course_code"]),
    }


# ── 5.3 At-risk students ───────────────────────────────────────────────────────

async def get_at_risk_students(
    db: AsyncSession,
    threshold: float = 75.0,
    department: Optional[str] = None,
) -> list[dict]:
    """
    Return students whose overall attendance is below `threshold`%.
    Only students with ≥1 closed session are included.
    """
    # Count total closed sessions per student
    total_q = (
        select(
            Attendance.student_id,
            func.count(Attendance.id).label("total"),
            func.sum(
                case((Attendance.status == AttendanceStatus.present, 1), else_=0)
            ).label("present"),
        )
        .join(Session, Attendance.session_id == Session.id)
        .where(Session.status == SessionStatus.closed)
        .group_by(Attendance.student_id)
    )
    rows = (await db.execute(total_q)).all()

    at_risk = []
    for row in rows:
        if row.total == 0:
            continue
        pct = round(row.present / row.total * 100, 1)
        if pct < threshold:
            at_risk.append({"student_id": row.student_id, "total": row.total, "present": row.present, "pct": pct})

    if not at_risk:
        return []

    # Fetch student details
    student_ids = [r["student_id"] for r in at_risk]
    students_res = await db.execute(select(Student).where(Student.id.in_(student_ids)))
    students_map = {s.id: s for s in students_res.scalars().all()}

    result = []
    for r in at_risk:
        s = students_map.get(r["student_id"])
        if not s:
            continue
        if department and s.department and department.lower() not in s.department.lower():
            continue
        severity = "critical" if r["pct"] < 60 else "warning"
        result.append(
            {
                "student_id": str(r["student_id"]),
                "student_name": s.name,
                "roll_no": s.roll_no,
                "student_code": s.student_id,
                "department": s.department,
                "attendance_pct": r["pct"],
                "total_sessions": r["total"],
                "present_sessions": r["present"],
                "severity": severity,
            }
        )

    return sorted(result, key=lambda x: x["attendance_pct"])


# ── 5.4 Attendance trends ─────────────────────────────────────────────────────

async def get_attendance_trends(
    db: AsyncSession,
    course_id: Optional[UUID] = None,
    period: str = "weekly",
    limit: int = 12,
) -> list[dict]:
    """
    Return aggregated attendance % bucketed by day / week / month.
    period: "daily" | "weekly" | "monthly"
    """
    q = (
        select(Session)
        .where(Session.status == SessionStatus.closed, Session.total_enrolled > 0)
    )
    if course_id:
        q = q.where(Session.course_id == course_id)
    q = q.order_by(Session.start_time.desc()).limit(limit * 10)
    sessions = (await db.execute(q)).scalars().all()

    # Bucket sessions
    buckets: dict[str, list[float]] = {}
    for s in sessions:
        dt = s.start_time
        if period == "daily":
            key = dt.strftime("%Y-%m-%d")
            label = dt.strftime("%d %b")
        elif period == "monthly":
            key = dt.strftime("%Y-%m")
            label = dt.strftime("%b %Y")
        else:  # weekly
            iso = dt.isocalendar()
            key = f"{iso.year}-W{iso.week:02d}"
            label = f"W{iso.week} {iso.year}"

        pct = round(s.total_present / s.total_enrolled * 100, 1)
        buckets.setdefault(key, []).append(pct)

    # Average within each bucket, most-recent-first then reverse for chart
    trend = []
    for key in sorted(buckets.keys())[-limit:]:
        vals = buckets[key]
        avg = round(sum(vals) / len(vals), 1)
        # Build a short label
        if period == "daily":
            dt_str = key
            dt = datetime.strptime(dt_str, "%Y-%m-%d")
            label = dt.strftime("%d %b")
        elif period == "monthly":
            dt = datetime.strptime(key + "-01", "%Y-%m-%d")
            label = dt.strftime("%b %Y")
        else:
            parts = key.split("-W")
            label = f"W{parts[1]}"
        trend.append({"period": key, "label": label, "avg_attendance_pct": avg, "session_count": len(vals)})

    return trend


# ── 5.5 Last-seen per student in a session ────────────────────────────────────

async def get_last_seen(db: AsyncSession, session_id: UUID) -> list[dict]:
    """Return first_seen timestamp for each student in the session."""
    q = (
        select(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .where(Attendance.session_id == session_id)
        .order_by(Attendance.first_seen.desc().nullslast())
    )
    rows = (await db.execute(q)).all()
    return [
        {
            "student_id": str(att.student_id),
            "student_name": student.name,
            "roll_no": student.roll_no,
            "status": att.status.value,
            "first_seen": att.first_seen.isoformat() if att.first_seen else None,
        }
        for att, student in rows
    ]


# ── Dashboard summary helper ───────────────────────────────────────────────────

async def get_dashboard_summary(db: AsyncSession) -> dict:
    """Lightweight summary for DashboardHome."""
    students_count = (await db.execute(select(func.count()).select_from(Student))).scalar() or 0
    courses_count = (await db.execute(select(func.count()).select_from(Course))).scalar() or 0

    # Recent closed sessions (last 5)
    recent_q = (
        select(Session, Course)
        .join(Course, Session.course_id == Course.id)
        .where(Session.status == SessionStatus.closed)
        .order_by(Session.start_time.desc())
        .limit(5)
    )
    recent_rows = (await db.execute(recent_q)).all()
    recent_sessions = [
        {
            "id": str(s.id),
            "session_id": s.session_id,
            "course_name": c.name,
            "course_code": c.code,
            "start_time": s.start_time.isoformat(),
            "total_present": s.total_present,
            "total_enrolled": s.total_enrolled,
            "total_unknown": s.total_unknown,
            "attendance_pct": (
                round(s.total_present / s.total_enrolled * 100, 1) if s.total_enrolled else 0
            ),
        }
        for s, c in recent_rows
    ]

    # Avg attendance across all closed sessions
    avg_q = await db.execute(
        select(func.avg(
            case(
                (Session.total_enrolled > 0,
                 Session.total_present * 100.0 / Session.total_enrolled),
                else_=None,
            )
        ))
        .select_from(Session)
        .where(Session.status == SessionStatus.closed)
    )
    avg_attendance = round(float(avg_q.scalar() or 0), 1)

    # Courses (for "Today's Schedule")
    courses_q = await db.execute(
        select(Course).order_by(Course.code).limit(5)
    )
    courses = [
        {"id": str(c.id), "code": c.code, "name": c.name, "slots": c.slots}
        for c in courses_q.scalars().all()
    ]

    return {
        "total_students": students_count,
        "total_courses": courses_count,
        "avg_attendance_pct": avg_attendance,
        "recent_sessions": recent_sessions,
        "courses": courses,
    }
