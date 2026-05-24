from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus, SessionStatus
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceRecordResponse,
    CreateSessionRequest,
    MarkAttendanceRequest,
    SessionResponse,
)
from app.schemas.common import PaginationMeta
from app.utils.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError


class AttendanceService:
    async def create_session(
        self,
        db: AsyncSession,
        *,
        teacher: User,
        body: CreateSessionRequest,
    ) -> SessionResponse:
        if teacher.role not in {UserRole.TEACHER, UserRole.ADMIN}:
            raise ForbiddenError("Only teachers can create sessions", code="INSUFFICIENT_ROLE")

        session = AttendanceSession(
            course_code=body.course_code,
            room=body.room,
            status=SessionStatus.ACTIVE,
            started_at=datetime.now(UTC),
            created_by_id=teacher.id,
        )
        db.add(session)
        await db.flush()
        await db.refresh(session)
        return SessionResponse.model_validate(session)

    async def close_session(self, db: AsyncSession, *, teacher: User, session_id: UUID) -> SessionResponse:
        session = await self._get_session(db, session_id)
        if teacher.role not in {UserRole.TEACHER, UserRole.ADMIN}:
            raise ForbiddenError(code="INSUFFICIENT_ROLE")
        if session.status == SessionStatus.CLOSED:
            raise BadRequestError("Session is already closed", code="SESSION_CLOSED")

        session.status = SessionStatus.CLOSED
        session.closed_at = datetime.now(UTC)
        await db.flush()
        await db.refresh(session)
        return SessionResponse.model_validate(session)

    async def mark_attendance(
        self,
        db: AsyncSession,
        *,
        actor: User,
        session_id: UUID,
        body: MarkAttendanceRequest,
    ) -> AttendanceRecordResponse:
        if actor.role not in {UserRole.TEACHER, UserRole.ADMIN}:
            raise ForbiddenError(code="INSUFFICIENT_ROLE")

        session = await self._get_session(db, session_id)
        if session.status != SessionStatus.ACTIVE:
            raise BadRequestError("Session is not active", code="SESSION_NOT_ACTIVE")

        student = await self._resolve_student(db, body)
        existing = await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == session_id,
                AttendanceRecord.student_id == student.id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise ConflictError("Attendance already recorded for this student", code="ALREADY_MARKED")

        record = AttendanceRecord(
            session_id=session_id,
            student_id=student.id,
            status=body.status,
            marked_at=datetime.now(UTC),
            source=body.source,
            confidence=body.confidence,
            notes=body.notes,
        )
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return AttendanceRecordResponse.model_validate(record)

    async def list_records(
        self,
        db: AsyncSession,
        *,
        session_id: UUID,
        page: int,
        limit: int,
    ) -> tuple[list[AttendanceRecordResponse], PaginationMeta]:
        await self._get_session(db, session_id)

        total_result = await db.execute(
            select(func.count()).select_from(AttendanceRecord).where(AttendanceRecord.session_id == session_id)
        )
        total = int(total_result.scalar_one())
        offset = (page - 1) * limit

        result = await db.execute(
            select(AttendanceRecord)
            .where(AttendanceRecord.session_id == session_id)
            .options(selectinload(AttendanceRecord.student))
            .order_by(AttendanceRecord.marked_at.desc())
            .offset(offset)
            .limit(limit)
        )
        records = result.scalars().all()
        meta = PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=(total + limit - 1) // limit if total else 0,
        )
        return [AttendanceRecordResponse.model_validate(r) for r in records], meta

    async def _get_session(self, db: AsyncSession, session_id: UUID) -> AttendanceSession:
        result = await db.execute(select(AttendanceSession).where(AttendanceSession.id == session_id))
        session = result.scalar_one_or_none()
        if session is None:
            raise NotFoundError("Attendance session not found", code="SESSION_NOT_FOUND")
        return session

    async def _resolve_student(self, db: AsyncSession, body: MarkAttendanceRequest) -> User:
        if body.student_id is not None:
            result = await db.execute(
                select(User).where(
                    User.id == body.student_id,
                    User.role == UserRole.STUDENT,
                    User.deleted_at.is_(None),
                )
            )
            student = result.scalar_one_or_none()
            if student is None:
                raise NotFoundError("Student not found", code="STUDENT_NOT_FOUND")
            return student

        if body.student_external_id:
            result = await db.execute(
                select(User).where(
                    User.student_id == body.student_external_id,
                    User.role == UserRole.STUDENT,
                    User.deleted_at.is_(None),
                )
            )
            student = result.scalar_one_or_none()
            if student is None:
                raise NotFoundError("Student not found", code="STUDENT_NOT_FOUND")
            return student

        raise BadRequestError("student_id or student_external_id is required", code="MISSING_STUDENT")
