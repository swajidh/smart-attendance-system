"""
Alert service — low-engagement detection, risk-list generation, per-course
attention thresholds, alert persistence, and notification preferences.

All in-memory state (thresholds, engagement tracking, notification prefs)
is intentionally lightweight; no extra DB migrations are needed for Phase 7.
DB writes only happen when an Alert is fired.
"""

from __future__ import annotations
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.alert import Alert, AlertType, AlertSeverity
from app.models.student import Student


# ─────────────────────────────────────────────────────────────────────────────
# 7.3  Per-course attention thresholds (in-memory; default 40 / 100)
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_ATTENTION_THRESHOLD = 40.0   # score below this = low engagement
DEFAULT_ATTENDANCE_THRESHOLD = 75.0  # attendance % below this = at-risk

_attention_thresholds: dict[str, float] = {}   # course_id → value
_attendance_thresholds: dict[str, float] = {}  # course_id → value


def set_threshold(course_id: str, attention: Optional[float] = None,
                  attendance: Optional[float] = None) -> dict:
    if attention is not None:
        _attention_thresholds[course_id] = float(attention)
    if attendance is not None:
        _attendance_thresholds[course_id] = float(attendance)
    return get_threshold(course_id)


def get_threshold(course_id: str) -> dict:
    return {
        "course_id": course_id,
        "attention_threshold": _attention_thresholds.get(
            course_id, DEFAULT_ATTENTION_THRESHOLD
        ),
        "attendance_threshold": _attendance_thresholds.get(
            course_id, DEFAULT_ATTENDANCE_THRESHOLD
        ),
    }


def get_all_thresholds() -> list[dict]:
    course_ids = set(_attention_thresholds) | set(_attendance_thresholds)
    return [get_threshold(cid) for cid in sorted(course_ids)]


# ─────────────────────────────────────────────────────────────────────────────
# 7.1  Low-engagement tracker (in-memory)
# State: (session_id, student_id) → {below_since: float, alerted: bool}
# ─────────────────────────────────────────────────────────────────────────────
_LOW_ENGAGEMENT_HOLD = 5 * 60   # 5 minutes in seconds
_eng_tracker: dict[tuple[str, str], dict] = {}


def check_low_engagement(
    session_id: str,
    student_id: str,
    score: float,
    course_id: Optional[str] = None,
) -> bool:
    """
    Track how long `score` has been below the threshold for this student.
    Returns True (and resets the alerted flag) exactly once per breach,
    when the student has been disengaged for >= LOW_ENGAGEMENT_HOLD seconds.
    """
    threshold = _attention_thresholds.get(
        course_id or "", DEFAULT_ATTENTION_THRESHOLD
    )
    key = (session_id, student_id)
    now = time.time()

    if score >= threshold:
        # Student is engaging — clear state
        _eng_tracker.pop(key, None)
        return False

    if key not in _eng_tracker:
        _eng_tracker[key] = {"below_since": now, "alerted": False}
        return False

    state = _eng_tracker[key]
    duration = now - state["below_since"]

    if duration >= _LOW_ENGAGEMENT_HOLD and not state["alerted"]:
        state["alerted"] = True
        return True   # fire alert

    return False


def reset_engagement_tracker(session_id: str) -> None:
    keys = [k for k in _eng_tracker if k[0] == session_id]
    for k in keys:
        del _eng_tracker[k]


# ─────────────────────────────────────────────────────────────────────────────
# 7.4  Alert log — immutable DB writes
# ─────────────────────────────────────────────────────────────────────────────

async def log_alert(
    db: AsyncSession,
    *,
    alert_type: AlertType,
    severity: AlertSeverity,
    message: str,
    student_id: Optional[UUID] = None,
) -> Alert:
    """Persist an immutable alert record."""
    alert = Alert(
        id=uuid.uuid4(),
        student_id=student_id,
        alert_type=alert_type,
        severity=severity,
        message=message,
        resolved=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


async def log_low_engagement_alert(
    db: AsyncSession,
    student_id: UUID,
    student_name: str,
    score: float,
    session_id: str,
) -> Alert:
    severity = AlertSeverity.high if score < 20 else AlertSeverity.medium
    return await log_alert(
        db,
        alert_type=AlertType.low_engagement,
        severity=severity,
        message=(
            f"{student_name} has been disengaged for >5 minutes "
            f"(score {score:.0f}/100) in session {session_id}."
        ),
        student_id=student_id,
    )


async def log_low_attendance_alert(
    db: AsyncSession,
    student_id: UUID,
    student_name: str,
    pct: float,
) -> Alert:
    severity = AlertSeverity.critical if pct < 60 else AlertSeverity.high
    return await log_alert(
        db,
        alert_type=AlertType.low_attendance,
        severity=severity,
        message=(
            f"{student_name} has {pct:.1f}% attendance — below the required threshold."
        ),
        student_id=student_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 7.2  Query & resolve alerts
# ─────────────────────────────────────────────────────────────────────────────

async def get_alerts(
    db: AsyncSession,
    student_id: Optional[UUID] = None,
    alert_type: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 100,
    student_ids: Optional[list[UUID]] = None,
) -> list[dict]:
    q = select(Alert, Student).outerjoin(
        Student, Alert.student_id == Student.id
    )
    if student_id:
        q = q.where(Alert.student_id == student_id)
    if student_ids is not None:
        if not student_ids:
            return []
        q = q.where(Alert.student_id.in_(student_ids))
    if alert_type:
        q = q.where(Alert.alert_type == alert_type)
    if resolved is not None:
        q = q.where(Alert.resolved == resolved)
    q = q.order_by(Alert.created_at.desc()).limit(limit)

    rows = (await db.execute(q)).all()
    return [_alert_to_dict(alert, student) for alert, student in rows]


async def resolve_alert(db: AsyncSession, alert_id: UUID) -> Optional[dict]:
    res = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = res.scalar_one_or_none()
    if not alert:
        return None
    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return _alert_to_dict(alert, None)


def _alert_to_dict(alert: Alert, student: Optional[Student]) -> dict:
    return {
        "id": str(alert.id),
        "student_id": str(alert.student_id) if alert.student_id else None,
        "student_name": student.name if student else None,
        "roll_no": student.roll_no if student else None,
        "alert_type": alert.alert_type.value,
        "severity": alert.severity.value,
        "message": alert.message,
        "resolved": alert.resolved,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        "created_at": alert.created_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7.5  Risk list — students with repeated weekly issues
# ─────────────────────────────────────────────────────────────────────────────

async def generate_risk_list(
    db: AsyncSession,
    weeks: int = 4,
    student_ids: Optional[list[UUID]] = None,
) -> list[dict]:
    """
    Combine at-risk attendance (< 75%) and repeated low-engagement
    from the last N weeks into a unified risk list, sorted by risk level.
    """
    from app.services.report_service import get_at_risk_students
    from app.models.attention_log import AttentionLog
    from app.models.session import Session, SessionStatus

    cutoff = datetime.now(timezone.utc) - timedelta(weeks=weeks)

    # --- At-risk attendance ---
    at_risk_att = await get_at_risk_students(db, threshold=75.0, student_ids=student_ids)
    att_map: dict[str, dict] = {r["student_id"]: r for r in at_risk_att}

    # --- Low-engagement sessions per student ---
    eng_q = (
        select(
            AttentionLog.student_id,
            AttentionLog.session_id,
            func.avg(AttentionLog.score).label("session_avg"),
        )
        .join(Session, AttentionLog.session_id == Session.id)
        .where(
            AttentionLog.timestamp >= cutoff,
            Session.status == SessionStatus.closed,
        )
    )
    if student_ids is not None:
        if not student_ids:
            return []
        eng_q = eng_q.where(AttentionLog.student_id.in_(student_ids))
    eng_q = eng_q.group_by(AttentionLog.student_id, AttentionLog.session_id)
    eng_rows = (await db.execute(eng_q)).all()

    # Count sessions where avg attention < threshold per student
    eng_low: dict[str, int] = {}
    eng_avg: dict[str, list[float]] = {}
    for row in eng_rows:
        sid = str(row.student_id)
        eng_avg.setdefault(sid, []).append(float(row.session_avg))
        threshold = DEFAULT_ATTENTION_THRESHOLD
        if float(row.session_avg) < threshold:
            eng_low[sid] = eng_low.get(sid, 0) + 1

    # --- Build unified risk list ---
    all_student_ids = set(att_map) | set(eng_low)
    if student_ids is not None:
        allowed = {str(sid) for sid in student_ids}
        all_student_ids = all_student_ids & allowed
    if not all_student_ids:
        return []

    students_res = await db.execute(
        select(Student).where(
            Student.id.in_([UUID(sid) for sid in all_student_ids])
        )
    )
    students_map = {str(s.id): s for s in students_res.scalars().all()}

    result = []
    for sid in all_student_ids:
        s = students_map.get(sid)
        if not s:
            continue
        att_info = att_map.get(sid, {})
        low_sessions = eng_low.get(sid, 0)
        avg_attn = (
            round(sum(eng_avg[sid]) / len(eng_avg[sid]), 1)
            if sid in eng_avg else None
        )
        risks = []
        if att_info:
            risks.append("low_attendance")
        if low_sessions >= 2:
            risks.append("low_engagement")

        # Risk score: higher = more urgent
        risk_score = 0
        if att_info:
            risk_score += max(0, 75 - att_info.get("attendance_pct", 75))
        if avg_attn is not None:
            risk_score += max(0, DEFAULT_ATTENTION_THRESHOLD - avg_attn) * 0.5

        result.append(
            {
                "student_id": sid,
                "student_name": s.name,
                "roll_no": s.roll_no,
                "department": s.department,
                "attendance_pct": att_info.get("attendance_pct"),
                "attendance_severity": att_info.get("severity"),
                "avg_attention": avg_attn,
                "low_engagement_sessions": low_sessions,
                "risk_factors": risks,
                "risk_score": round(risk_score, 1),
                "recommended_action": _recommended_action(risks, att_info, low_sessions),
            }
        )

    return sorted(result, key=lambda x: x["risk_score"], reverse=True)


def _recommended_action(risks: list[str], att_info: dict, low_eng: int) -> str:
    if "low_attendance" in risks and "low_engagement" in risks:
        return "Urgent intervention: schedule counsellor meeting"
    if "low_attendance" in risks:
        sev = att_info.get("severity", "warning")
        return ("Issue attendance warning letter" if sev == "critical"
                else "Send attendance reminder notification")
    if "low_engagement" in risks:
        return ("Review seating position and check for external stressors"
                if low_eng >= 4 else "Monitor closely for next 2 sessions")
    return "Monitor"


# ─────────────────────────────────────────────────────────────────────────────
# 7.6  Notification preferences (in-memory per user)
# ─────────────────────────────────────────────────────────────────────────────
_notif_prefs: dict[str, dict] = {}  # user_id → {channels, frequency}

DEFAULT_NOTIF = {
    "dashboard": True,
    "email": False,
    "frequency": "immediate",  # immediate | hourly | daily
}


def get_notification_prefs(user_id: str) -> dict:
    return _notif_prefs.get(user_id, dict(DEFAULT_NOTIF))


def set_notification_prefs(user_id: str, prefs: dict) -> dict:
    current = _notif_prefs.get(user_id, dict(DEFAULT_NOTIF))
    current.update({k: v for k, v in prefs.items() if k in DEFAULT_NOTIF})
    _notif_prefs[user_id] = current
    return current
