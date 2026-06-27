"""
Centralized attention aggregation queries — single source of truth for
dashboard, reports, correlation, batches, and courses.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attention_log import AttentionLog
from app.models.session import Session, SessionStatus
from app.models.course_student import CourseStudent

ATTENTION_LOW_THRESHOLD = 40.0
ATTENTION_HIGH_THRESHOLD = 70.0


async def get_student_avg_attention(
    db: AsyncSession,
    student_id: UUID,
    since: Optional[datetime] = None,
) -> float:
    """Average attention score for a student across closed sessions."""
    q = (
        select(func.avg(AttentionLog.score))
        .join(Session, AttentionLog.session_id == Session.id)
        .where(
            AttentionLog.student_id == student_id,
            Session.status == SessionStatus.closed,
        )
    )
    if since:
        q = q.where(AttentionLog.timestamp >= since)
    result = await db.execute(q)
    return round(float(result.scalar() or 0), 1)


async def get_session_attention_summary(
    db: AsyncSession,
    session_id: UUID,
) -> dict:
    """Class average + per-student averages for one session."""
    q = (
        select(
            AttentionLog.student_id,
            func.avg(AttentionLog.score).label("avg_score"),
            func.count(AttentionLog.id).label("samples"),
        )
        .where(AttentionLog.session_id == session_id)
        .group_by(AttentionLog.student_id)
    )
    rows = (await db.execute(q)).all()
    if not rows:
        return {"class_average": 0.0, "total_samples": 0, "students": {}}

    students = {
        str(r.student_id): {
            "avg_score": round(float(r.avg_score), 1),
            "samples": r.samples,
        }
        for r in rows
    }
    avgs = [s["avg_score"] for s in students.values()]
    total_samples = sum(s["samples"] for s in students.values())
    return {
        "class_average": round(sum(avgs) / len(avgs), 1) if avgs else 0.0,
        "total_samples": total_samples,
        "students": students,
    }


async def compute_and_store_session_aggregates(
    db: AsyncSession,
    session_id: UUID,
) -> dict:
    """Compute attention aggregates and return summary (caller may persist on Session)."""
    return await get_session_attention_summary(db, session_id)


async def get_course_avg_attention(
    db: AsyncSession,
    course_id: UUID,
) -> float:
    """Average attention across all closed sessions for a course."""
    q = (
        select(func.avg(AttentionLog.score))
        .join(Session, AttentionLog.session_id == Session.id)
        .where(
            Session.course_id == course_id,
            Session.status == SessionStatus.closed,
        )
    )
    result = await db.execute(q)
    return round(float(result.scalar() or 0), 1)


async def get_global_avg_attention(
    db: AsyncSession,
    student_ids: Optional[list[UUID]] = None,
) -> float:
    """Global average attention; optionally scoped to a student ID list."""
    q = (
        select(func.avg(AttentionLog.score))
        .join(Session, AttentionLog.session_id == Session.id)
        .where(Session.status == SessionStatus.closed)
    )
    if student_ids is not None:
        if not student_ids:
            return 0.0
        q = q.where(AttentionLog.student_id.in_(student_ids))
    result = await db.execute(q)
    return round(float(result.scalar() or 0), 1)


async def count_low_attention_students(
    db: AsyncSession,
    threshold: float = ATTENTION_LOW_THRESHOLD,
    student_ids: Optional[list[UUID]] = None,
) -> int:
    """Count students whose avg attention is below threshold."""
    subq = (
        select(
            AttentionLog.student_id.label("sid"),
            func.avg(AttentionLog.score).label("avg_attn"),
        )
        .join(Session, AttentionLog.session_id == Session.id)
        .where(Session.status == SessionStatus.closed)
        .group_by(AttentionLog.student_id)
    )
    if student_ids is not None:
        if not student_ids:
            return 0
        subq = subq.where(AttentionLog.student_id.in_(student_ids))

    rows = (await db.execute(subq)).all()
    return sum(1 for r in rows if float(r.avg_attn or 0) < threshold)


async def get_student_session_attention(
    db: AsyncSession,
    session_id: UUID,
    student_id: UUID,
) -> float:
    """Average attention for one student in one session."""
    q = (
        select(func.avg(AttentionLog.score))
        .where(
            AttentionLog.session_id == session_id,
            AttentionLog.student_id == student_id,
        )
    )
    result = await db.execute(q)
    return round(float(result.scalar() or 0), 1)


async def get_attention_trends(
    db: AsyncSession,
    course_id: Optional[UUID] = None,
    period: str = "weekly",
    limit: int = 12,
) -> list[dict]:
    """Bucketed average attention % (mirrors attendance trend shape)."""
    from datetime import datetime as dt

    q = select(Session).where(
        Session.status == SessionStatus.closed,
        Session.avg_class_attention.isnot(None),
    )
    if course_id:
        q = q.where(Session.course_id == course_id)
    q = q.order_by(Session.start_time.desc()).limit(limit * 10)
    sessions = (await db.execute(q)).scalars().all()

    buckets: dict[str, list[float]] = {}
    for s in sessions:
        ts = s.start_time
        if period == "daily":
            key = ts.strftime("%Y-%m-%d")
        elif period == "monthly":
            key = ts.strftime("%Y-%m")
        else:
            iso = ts.isocalendar()
            key = f"{iso.year}-W{iso.week:02d}"
        buckets.setdefault(key, []).append(float(s.avg_class_attention or 0))

    trend = []
    for key in sorted(buckets.keys())[-limit:]:
        vals = buckets[key]
        avg = round(sum(vals) / len(vals), 1)
        if period == "daily":
            label = dt.strptime(key, "%Y-%m-%d").strftime("%d %b")
        elif period == "monthly":
            label = dt.strptime(key + "-01", "%Y-%m-%d").strftime("%b %Y")
        else:
            label = f"W{key.split('-W')[1]}"
        trend.append({
            "period": key,
            "label": label,
            "avg_attention": avg,
            "session_count": len(vals),
        })
    return trend
