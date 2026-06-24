"""
Attention service — DB operations for the AttentionLog table.

All 'live' (in-session) scores come from the in-memory attention_scorer module.
DB writes happen periodically from the WebSocket handler.
DB reads (history / timeline) query the attention_logs table.
"""

from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.attention_log import AttentionLog
from app.models.session import Session, SessionStatus
from app.models.student import Student
from app.models.course import Course


# ── 6.5a Store ────────────────────────────────────────────────────────────────

async def store_attention_log(
    db: AsyncSession,
    session_id: UUID,
    student_id: UUID,
    score: float,
    head_pose: Optional[dict] = None,
    posture: Optional[str] = None,
) -> AttentionLog:
    """Persist one attention snapshot to the DB."""
    log = AttentionLog(
        id=uuid4(),
        session_id=session_id,
        student_id=student_id,
        score=round(score, 2),
        head_pose=head_pose,
        posture=posture,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()
    return log


# ── 6.5b Live scores (from in-memory scorer) ─────────────────────────────────

def get_live_scores(session_id: str) -> list[dict]:
    """
    Return current in-memory attention scores for all students in a session.
    Delegates to the `ml.attention_scorer` module.
    """
    try:
        import sys, os
        _root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
        )
        if _root not in sys.path:
            sys.path.insert(0, _root)
        from ml import attention_scorer
        scores = attention_scorer.get_session_scores(session_id)
        avg = attention_scorer.get_class_average(session_id)
        return {
            "students": [{"student_id": sid, "score": s} for sid, s in scores.items()],
            "class_average": avg,
        }
    except Exception:
        return {"students": [], "class_average": 0.0}


# ── 6.5c Class engagement from DB ─────────────────────────────────────────────

async def get_class_engagement(db: AsyncSession, session_id: UUID) -> dict:
    """
    Return the average attention score per student for a given session,
    computed from stored AttentionLog rows.
    Includes the class mean and a list of per-student averages.
    """
    q = (
        select(
            AttentionLog.student_id,
            func.avg(AttentionLog.score).label("avg_score"),
            func.count(AttentionLog.id).label("samples"),
            func.min(AttentionLog.score).label("min_score"),
            func.max(AttentionLog.score).label("max_score"),
        )
        .where(AttentionLog.session_id == session_id)
        .group_by(AttentionLog.student_id)
    )
    rows = (await db.execute(q)).all()
    if not rows:
        return {"class_average": 0.0, "students": []}

    student_ids = [r.student_id for r in rows]
    students_res = await db.execute(select(Student).where(Student.id.in_(student_ids)))
    students_map = {s.id: s for s in students_res.scalars().all()}

    students = []
    total = 0.0
    for row in rows:
        s = students_map.get(row.student_id)
        avg = round(float(row.avg_score), 1)
        total += avg
        students.append(
            {
                "student_id": str(row.student_id),
                "student_name": s.name if s else None,
                "roll_no": s.roll_no if s else None,
                "avg_score": avg,
                "min_score": round(float(row.min_score), 1),
                "max_score": round(float(row.max_score), 1),
                "samples": row.samples,
                "level": _score_level(avg),
            }
        )

    class_avg = round(total / len(students), 1) if students else 0.0
    return {
        "class_average": class_avg,
        "level": _score_level(class_avg),
        "students": sorted(students, key=lambda x: x["avg_score"]),
    }


# ── 6.5d Session timeline ─────────────────────────────────────────────────────

async def get_session_timeline(db: AsyncSession, session_id: UUID) -> list[dict]:
    """
    Return a time-series of class average attention scores for a session,
    bucketed into 2-minute intervals.
    """
    q = (
        select(AttentionLog)
        .where(AttentionLog.session_id == session_id)
        .order_by(AttentionLog.timestamp)
    )
    logs = (await db.execute(q)).scalars().all()
    if not logs:
        return []

    # Bucket into 2-minute slots
    buckets: dict[str, list[float]] = {}
    for log in logs:
        ts = log.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        # Round down to nearest 2 minutes
        rounded = ts.replace(second=0, microsecond=0)
        rounded = rounded.replace(minute=(rounded.minute // 2) * 2)
        key = rounded.strftime("%H:%M")
        buckets.setdefault(key, []).append(log.score)

    return [
        {
            "time": k,
            "avg_score": round(sum(v) / len(v), 1),
            "sample_count": len(v),
        }
        for k, v in sorted(buckets.items())
    ]


# ── 6.5e Disengagement history ────────────────────────────────────────────────

async def get_disengagement_history(
    db: AsyncSession,
    student_id: UUID,
    weeks: int = 4,
) -> dict:
    """
    Return a student's attention trend over the last N weeks,
    flagging weeks where they had persistent low engagement (< 50 in ≥2 sessions).
    """
    student_res = await db.execute(select(Student).where(Student.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        return {}

    cutoff = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    q = (
        select(
            AttentionLog.session_id,
            func.avg(AttentionLog.score).label("session_avg"),
            func.min(AttentionLog.timestamp).label("session_start"),
        )
        .where(
            AttentionLog.student_id == student_id,
            AttentionLog.timestamp >= cutoff,
        )
        .group_by(AttentionLog.session_id)
        .order_by(func.min(AttentionLog.timestamp))
    )
    rows = (await db.execute(q)).all()

    sessions = [
        {
            "session_id": str(r.session_id),
            "date": r.session_start.strftime("%Y-%m-%d") if r.session_start else None,
            "avg_score": round(float(r.session_avg), 1),
            "level": _score_level(float(r.session_avg)),
        }
        for r in rows
    ]

    # Weekly bucketing
    weekly: dict[str, list[float]] = {}
    for s in sessions:
        if not s["date"]:
            continue
        dt = datetime.strptime(s["date"], "%Y-%m-%d")
        iso = dt.isocalendar()
        week_key = f"{iso.year}-W{iso.week:02d}"
        weekly.setdefault(week_key, []).append(s["avg_score"])

    weekly_trend = [
        {
            "week": k,
            "avg_score": round(sum(v) / len(v), 1),
            "sessions": len(v),
            "low_sessions": sum(1 for x in v if x < 50),
            "flagged": sum(1 for x in v if x < 50) >= 2,
        }
        for k, v in sorted(weekly.items())
    ]

    return {
        "student_id": str(student_id),
        "student_name": student.name,
        "roll_no": student.roll_no,
        "overall_avg": (
            round(sum(s["avg_score"] for s in sessions) / len(sessions), 1)
            if sessions else 0.0
        ),
        "sessions": sessions,
        "weekly_trend": weekly_trend,
        "persistent_low": sum(1 for w in weekly_trend if w["flagged"]) >= 2,
    }


# ── helper ────────────────────────────────────────────────────────────────────

def _score_level(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"
