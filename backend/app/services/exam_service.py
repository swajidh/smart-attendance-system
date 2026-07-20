"""
Exam monitoring service — separate from attendance sessions.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

import cv2
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.audit_log import AuditLog
from app.models.course import Course
from app.models.course_student import CourseStudent
from app.models.exam_calibration import ExamCalibration
from app.models.exam_session import ExamSession, ExamSessionStatus
from app.models.exam_violation import (
    ExamReviewStatus,
    ExamViolation,
    ExamViolationSeverity,
    ExamViolationType,
)
from app.models.student import EmbeddingStatus, Student
from app.models.user import User

logger = logging.getLogger(__name__)

_exam_roster_cache: dict[str, dict[str, list[float]]] = {}
_exam_roster_meta: dict[str, dict[str, dict]] = {}
_calibration_buffer: dict[str, list[dict]] = {}
_flagged_students: dict[str, set[str]] = {}


async def create_exam_session(
    db: AsyncSession,
    course_id: UUID,
    room_name: str,
    user: User,
) -> ExamSession:
    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if not course:
        raise ValueError("Course not found")

    count = (
        await db.execute(select(func.count()).select_from(ExamSession).where(ExamSession.course_id == course_id))
    ).scalar() or 0
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    exam_code = f"EXM-{today}-{(count + 1):03d}"

    exam = ExamSession(
        exam_code=exam_code,
        course_id=course_id,
        room_name=room_name,
        status=ExamSessionStatus.scheduled,
        started_by=user.id,
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam


async def get_exam(db: AsyncSession, exam_id: UUID) -> Optional[ExamSession]:
    return (await db.execute(select(ExamSession).where(ExamSession.id == exam_id))).scalar_one_or_none()


async def exam_in_scope(
    db: AsyncSession,
    exam: ExamSession,
    student_scope: Optional[list[UUID]],
) -> bool:
    """Counselors only see exams for courses enrolling at least one student in their batch."""
    if student_scope is None:
        return True
    if not student_scope:
        return False
    count = (
        await db.execute(
            select(func.count())
            .select_from(CourseStudent)
            .where(
                CourseStudent.course_id == exam.course_id,
                CourseStudent.student_id.in_(student_scope),
            )
        )
    ).scalar() or 0
    return count > 0


async def list_exams(
    db: AsyncSession,
    course_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
    student_scope: Optional[list[UUID]] = None,
) -> list[ExamSession]:
    q = select(ExamSession).order_by(ExamSession.created_at.desc()).offset(skip).limit(limit)
    if course_id:
        q = q.where(ExamSession.course_id == course_id)
    if student_scope is not None:
        if not student_scope:
            return []
        scoped_courses = (
            select(CourseStudent.course_id)
            .where(CourseStudent.student_id.in_(student_scope))
            .distinct()
        )
        q = q.where(ExamSession.course_id.in_(scoped_courses))
    return (await db.execute(q)).scalars().all()


async def start_exam(db: AsyncSession, exam_id: UUID) -> ExamSession:
    exam = await get_exam(db, exam_id)
    if not exam:
        raise ValueError("Exam not found")
    if exam.status not in (ExamSessionStatus.scheduled, ExamSessionStatus.calibrating):
        raise ValueError(f"Cannot start exam in status {exam.status.value}")

    exam.status = ExamSessionStatus.calibrating
    exam.start_time = datetime.now(timezone.utc)
    _calibration_buffer[str(exam_id)] = []
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam


def append_calibration_samples(exam_id: str, samples: list[dict]) -> None:
    buf = _calibration_buffer.setdefault(exam_id, [])
    buf.extend(samples)


async def finalize_calibration(db: AsyncSession, exam_id: UUID) -> ExamSession:
    import sys

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    if root not in sys.path:
        sys.path.insert(0, root)
    from ml.exam_gaze import compute_baseline

    exam = await get_exam(db, exam_id)
    if not exam:
        raise ValueError("Exam not found")

    samples = _calibration_buffer.get(str(exam_id), [])
    poses = [{"yaw": s["yaw"], "pitch": s["pitch"]} for s in samples if "yaw" in s]
    baseline = compute_baseline(poses)

    cal = ExamCalibration(
        exam_session_id=exam.id,
        sample_count=baseline["sample_count"],
        baseline_yaw=baseline["baseline_yaw"],
        baseline_pitch=baseline["baseline_pitch"],
        per_student_samples={"samples": samples[:500]},
        completed_at=datetime.now(timezone.utc),
    )
    db.add(cal)

    exam.baseline_yaw = baseline["baseline_yaw"]
    exam.baseline_pitch = baseline["baseline_pitch"]
    exam.calibration_complete = True
    exam.status = ExamSessionStatus.active
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam


async def close_exam_session(db: AsyncSession, exam_id: UUID) -> ExamSession:
    exam = await get_exam(db, exam_id)
    if not exam:
        raise ValueError("Exam not found")
    if exam.status == ExamSessionStatus.closed:
        raise ValueError("Exam already closed")

    exam.status = ExamSessionStatus.closed
    exam.end_time = datetime.now(timezone.utc)
    db.add(exam)
    await db.commit()

    eid = str(exam_id)
    _exam_roster_cache.pop(eid, None)
    _exam_roster_meta.pop(eid, None)
    _calibration_buffer.pop(eid, None)
    _flagged_students.pop(eid, None)

    try:
        import sys

        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        if root not in sys.path:
            sys.path.insert(0, root)
        from ml.exam_pipeline import clear_exam_state

        clear_exam_state(eid)
    except Exception:
        pass

    await db.refresh(exam)
    return exam


async def load_exam_roster_cache(db: AsyncSession, exam: ExamSession) -> tuple[dict, dict]:
    eid = str(exam.id)
    if eid in _exam_roster_cache:
        return _exam_roster_cache[eid], _exam_roster_meta[eid]

    q = (
        select(CourseStudent, Student)
        .join(Student, CourseStudent.student_id == Student.id)
        .where(CourseStudent.course_id == exam.course_id)
    )
    rows = (await db.execute(q)).all()
    embeddings: dict[str, list[float]] = {}
    meta: dict[str, dict] = {}
    for _, student in rows:
        if student.embedding_status == EmbeddingStatus.enrolled and student.embedding:
            sid = str(student.id)
            embeddings[sid] = student.embedding
            meta[sid] = {
                "name": student.name,
                "student_code": student.student_id,
                "roll_no": student.roll_no,
            }
    _exam_roster_cache[eid] = embeddings
    _exam_roster_meta[eid] = meta
    return embeddings, meta


def get_cached_exam_roster(exam_id: str) -> tuple[dict, dict]:
    return _exam_roster_cache.get(exam_id, {}), _exam_roster_meta.get(exam_id, {})


def _violation_severity(vtype: str) -> ExamViolationSeverity:
    mapping = {
        "phone_detected": ExamViolationSeverity.critical,
        "multiple_faces": ExamViolationSeverity.critical,
        "unauthorized_object": ExamViolationSeverity.high,
        "gaze_away": ExamViolationSeverity.high,
        "unknown_face": ExamViolationSeverity.medium,
        "smartwatch_suspected": ExamViolationSeverity.medium,
        "face_absent": ExamViolationSeverity.high,
    }
    return mapping.get(vtype, ExamViolationSeverity.medium)


async def log_violation(
    db: AsyncSession,
    exam: ExamSession,
    event: dict,
    frame_bgr: Optional[np.ndarray] = None,
) -> ExamViolation:
    vtype_str = event.get("violation_type", "gaze_away")
    try:
        vtype = ExamViolationType(vtype_str)
    except ValueError:
        vtype = ExamViolationType.gaze_away

    student_uuid = None
    sid = event.get("student_id")
    if sid and sid not in ("unknown", "hall"):
        try:
            student_uuid = UUID(sid)
        except ValueError:
            student_uuid = None

    snapshot_path = None
    if frame_bgr is not None:
        snap_dir = os.path.join(settings.UPLOAD_DIR, "exam_violations", str(exam.id))
        os.makedirs(snap_dir, exist_ok=True)
        fname = f"{uuid4().hex}.jpg"
        fpath = os.path.join(snap_dir, fname)
        cv2.imwrite(fpath, frame_bgr)
        snapshot_path = f"exam_violations/{exam.id}/{fname}"

    violation = ExamViolation(
        exam_session_id=exam.id,
        student_id=student_uuid,
        violation_type=vtype,
        severity=_violation_severity(vtype_str),
        confidence=float(event.get("confidence", 0.5)),
        sustained_seconds=float(event.get("sustained_seconds", 0)),
        message=event.get("message", vtype_str),
        snapshot_path=snapshot_path,
        bbox=event.get("bbox"),
        metadata_=event.get("metadata"),
        review_status=ExamReviewStatus.pending,
    )
    db.add(violation)

    exam.total_violations = (exam.total_violations or 0) + 1
    if vtype == ExamViolationType.phone_detected:
        exam.phones_detected = (exam.phones_detected or 0) + 1
    if student_uuid:
        flagged = _flagged_students.setdefault(str(exam.id), set())
        if sid not in flagged:
            flagged.add(sid)
            exam.students_flagged = len(flagged)
    db.add(exam)
    await db.commit()
    await db.refresh(violation)
    return violation


async def list_violations(
    db: AsyncSession,
    exam_id: UUID,
    review_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    student_scope: Optional[list[UUID]] = None,
) -> list[dict]:
    q = (
        select(ExamViolation, Student)
        .outerjoin(Student, ExamViolation.student_id == Student.id)
        .where(ExamViolation.exam_session_id == exam_id)
        .order_by(ExamViolation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if review_status:
        q = q.where(ExamViolation.review_status == ExamReviewStatus(review_status))
    if student_scope is not None:
        if not student_scope:
            return []
        q = q.where(ExamViolation.student_id.in_(student_scope))
    rows = (await db.execute(q)).all()
    out = []
    for viol, student in rows:
        out.append(
            {
                "id": viol.id,
                "exam_session_id": viol.exam_session_id,
                "student_id": viol.student_id,
                "student_name": student.name if student else event_name_from_msg(viol.message),
                "violation_type": viol.violation_type.value,
                "severity": viol.severity.value,
                "confidence": viol.confidence,
                "sustained_seconds": viol.sustained_seconds,
                "message": viol.message,
                "snapshot_path": viol.snapshot_path,
                "review_status": viol.review_status.value,
                "created_at": viol.created_at,
            }
        )
    return out


def event_name_from_msg(msg: str) -> Optional[str]:
    if " near " in msg:
        return msg.split(" near ", 1)[1]
    return None


async def review_violation(
    db: AsyncSession,
    violation_id: UUID,
    review_status: str,
    review_note: Optional[str],
    user: User,
) -> ExamViolation:
    viol = (
        await db.execute(select(ExamViolation).where(ExamViolation.id == violation_id))
    ).scalar_one_or_none()
    if not viol:
        raise ValueError("Violation not found")

    if review_status == ExamReviewStatus.dismissed.value and not (review_note and review_note.strip()):
        raise ValueError("Dismiss reason required")

    old_status = viol.review_status.value
    viol.review_status = ExamReviewStatus(review_status)
    viol.reviewed_by = user.id
    viol.reviewed_at = datetime.now(timezone.utc)
    viol.review_note = review_note
    db.add(viol)

    audit = AuditLog(
        user_id=user.id,
        action="exam_violation_review",
        entity_type="exam_violation",
        entity_id=str(violation_id),
        old_value={"review_status": old_status},
        new_value={"review_status": review_status, "note": review_note},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(viol)
    return viol


async def get_exam_dashboard(
    db: AsyncSession,
    student_scope: Optional[list[UUID]] = None,
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=7)

    active_q = select(func.count()).select_from(ExamSession).where(
        ExamSession.status == ExamSessionStatus.active
    )
    if student_scope is not None:
        if not student_scope:
            return {
                "active_exams": 0,
                "violations_7d": 0,
                "pending_reviews": 0,
                "phones_7d": 0,
            }
        scoped_courses = (
            select(CourseStudent.course_id)
            .where(CourseStudent.student_id.in_(student_scope))
            .distinct()
        )
        active_q = active_q.where(ExamSession.course_id.in_(scoped_courses))

    active = (await db.execute(active_q)).scalar() or 0

    def _violations_base():
        q = select(func.count()).select_from(ExamViolation)
        if student_scope is not None:
            q = q.where(ExamViolation.student_id.in_(student_scope))
        return q

    violations_7d = (
        await db.execute(_violations_base().where(ExamViolation.created_at >= since))
    ).scalar() or 0
    pending = (
        await db.execute(
            _violations_base().where(ExamViolation.review_status == ExamReviewStatus.pending)
        )
    ).scalar() or 0
    phones = (
        await db.execute(
            _violations_base().where(
                ExamViolation.created_at >= since,
                ExamViolation.violation_type == ExamViolationType.phone_detected,
            )
        )
    ).scalar() or 0
    return {
        "active_exams": active,
        "violations_7d": violations_7d,
        "pending_reviews": pending,
        "phones_7d": phones,
    }
