"""
Session service — create/close sessions, mark attendance, manual override.

In-memory roster embedding cache:
    _roster_cache[session_uuid_str] = {
        student_uuid_str: embedding_list  (unit-normalized float list)
    }
    _roster_names[session_uuid_str] = {
        student_uuid_str: {"name": str, "student_code": str, "roll_no": str}
    }
Cleared on session close.  Redis cache is Phase 10.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.models.session import Session, SessionStatus
from app.models.attendance import Attendance, AttendanceStatus, MarkedBy
from app.models.course import Course
from app.models.course_student import CourseStudent
from app.models.student import Student, EmbeddingStatus
from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)

# ── In-memory roster embedding cache ─────────────────────────────────────────
_roster_cache: dict[str, dict[str, list[float]]] = {}
_roster_meta: dict[str, dict[str, dict]] = {}
# _roster_meta[session_id_str][student_uuid_str] = {name, student_code, roll_no}


# ── Session CRUD ──────────────────────────────────────────────────────────────

async def create_session(
    db: AsyncSession,
    course_id: UUID,
    user: User,
) -> Session:
    """Create a session and pre-populate Attendance rows (all absent) from the course roster."""
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise ValueError(f"Course {course_id} not found")

    # Human-readable session ID
    count_res = await db.execute(
        select(func.count()).select_from(Session).where(Session.course_id == course_id)
    )
    session_num = (count_res.scalar() or 0) + 1
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    session_id_str = f"SES-{today}-{session_num:03d}"

    session = Session(
        session_id=session_id_str,
        course_id=course_id,
        status=SessionStatus.active,
        start_time=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()  # get session.id

    # Load enrolled students
    enrollment_q = (
        select(CourseStudent, Student)
        .join(Student, CourseStudent.student_id == Student.id)
        .where(CourseStudent.course_id == course_id)
    )
    rows = (await db.execute(enrollment_q)).all()

    enrolled_count = 0
    for cs, student in rows:
        attendance = Attendance(
            session_id=session.id,
            student_id=student.id,
            status=AttendanceStatus.absent,
            marked_by=MarkedBy.auto,
        )
        db.add(attendance)
        enrolled_count += 1

    session.total_enrolled = enrolled_count
    db.add(session)

    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: UUID) -> Optional[Session]:
    result = await db.execute(select(Session).where(Session.id == session_id))
    return result.scalar_one_or_none()


async def get_sessions(
    db: AsyncSession,
    course_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Session]:
    q = select(Session).order_by(Session.start_time.desc()).offset(skip).limit(limit)
    if course_id:
        q = q.where(Session.course_id == course_id)
    return (await db.execute(q)).scalars().all()


async def get_session_roster(db: AsyncSession, session_id: UUID) -> list[tuple[Attendance, Student]]:
    q = (
        select(Attendance, Student)
        .join(Student, Attendance.student_id == Student.id)
        .where(Attendance.session_id == session_id)
        .order_by(Student.name)
    )
    return (await db.execute(q)).all()


async def close_session(db: AsyncSession, session_id: UUID, user: User) -> Session:
    session = await get_session(db, session_id)
    if not session:
        raise ValueError("Session not found")
    if session.status != SessionStatus.active:
        raise ValueError("Session is not active")

    # Count present records
    present_res = await db.execute(
        select(func.count())
        .select_from(Attendance)
        .where(
            Attendance.session_id == session_id,
            Attendance.status == AttendanceStatus.present,
        )
    )
    present_count = present_res.scalar() or 0

    session.status = SessionStatus.closed
    session.end_time = datetime.now(timezone.utc)
    session.total_present = present_count
    session.total_absent = max(0, session.total_enrolled - present_count)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Clear from cache
    _roster_cache.pop(str(session_id), None)
    _roster_meta.pop(str(session_id), None)

    return session


# ── Attendance actions ────────────────────────────────────────────────────────

async def mark_present(
    db: AsyncSession,
    session_id: UUID,
    student_id: UUID,
    confidence: float,
) -> bool:
    """Idempotent mark-present. Returns True if status was changed."""
    result = await db.execute(
        select(Attendance).where(
            Attendance.session_id == session_id,
            Attendance.student_id == student_id,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        return False
    if record.status == AttendanceStatus.present:
        return False  # already marked

    record.status = AttendanceStatus.present
    record.confidence = confidence
    record.first_seen = datetime.now(timezone.utc)
    record.marked_by = MarkedBy.auto
    db.add(record)
    await db.commit()
    return True


async def manual_override(
    db: AsyncSession,
    record_id: UUID,
    new_status: AttendanceStatus,
    reason: Optional[str],
    user: User,
) -> Attendance:
    result = await db.execute(select(Attendance).where(Attendance.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise ValueError("Attendance record not found")

    old_status = record.status.value

    record.status = new_status
    record.marked_by = MarkedBy.manual
    record.modified_by_id = user.id
    record.modified_at = datetime.now(timezone.utc)
    record.override_reason = reason
    db.add(record)

    audit = AuditLog(
        action="manual_attendance_override",
        entity_type="attendance",
        entity_id=str(record_id),
        user_id=user.id,
        old_value={"status": old_status},
        new_value={"status": new_status.value, "reason": reason},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(record)
    return record


async def increment_unknown(db: AsyncSession, session_id: UUID) -> None:
    """Increment the unknown-face counter on the session (non-blocking best-effort)."""
    try:
        await db.execute(
            update(Session)
            .where(Session.id == session_id)
            .values(total_unknown=Session.total_unknown + 1)
        )
        await db.commit()
    except Exception as exc:
        logger.debug("increment_unknown failed: %s", exc)
        await db.rollback()


# ── Roster embedding cache ────────────────────────────────────────────────────

async def load_roster_cache(db: AsyncSession, session: Session) -> dict[str, list[float]]:
    """
    Load enrolled + embedded students into the in-memory cache for this session.
    Returns: {student_uuid_str: embedding_list}
    """
    sid = str(session.id)
    if sid in _roster_cache:
        return _roster_cache[sid]

    q = (
        select(Student)
        .join(CourseStudent, CourseStudent.student_id == Student.id)
        .where(
            CourseStudent.course_id == session.course_id,
            Student.embedding_status == EmbeddingStatus.enrolled,
            Student.embedding.is_not(None),
        )
    )
    students = (await db.execute(q)).scalars().all()

    embeddings: dict[str, list[float]] = {}
    meta: dict[str, dict] = {}
    for s in students:
        embeddings[str(s.id)] = s.embedding
        meta[str(s.id)] = {
            "name": s.name,
            "student_code": s.student_id,
            "roll_no": s.roll_no,
        }

    _roster_cache[sid] = embeddings
    _roster_meta[sid] = meta
    logger.info(
        "Loaded %d enrolled embeddings for session %s", len(embeddings), session.session_id
    )
    return embeddings


def get_cached_roster(session_id: UUID) -> tuple[dict, dict]:
    """Return (embedding_cache, meta_cache) for the session, or ({}, {})."""
    sid = str(session_id)
    return _roster_cache.get(sid, {}), _roster_meta.get(sid, {})
