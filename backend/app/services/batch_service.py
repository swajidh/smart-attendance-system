"""
Counselor batch assignment — intake groups (~40 students) per counselor.
"""

from __future__ import annotations

import csv
import io
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.counselor_batch import CounselorBatch
from app.models.student import Student
from app.models.user import User, UserRole
from app.models.alert import Alert
from app.schemas.student import StudentCreate
from app.services import student_service
from app.services.correlation_service import get_student_correlation

logger = logging.getLogger(__name__)

CSV_REQUIRED = {"intake_year", "batch_code", "counselor_email", "student_id"}


async def get_counselor_batches(
    db: AsyncSession,
    counselor_user_id: UUID,
) -> list[CounselorBatch]:
    result = await db.execute(
        select(CounselorBatch)
        .where(CounselorBatch.counselor_id == counselor_user_id)
        .order_by(CounselorBatch.intake_year.desc(), CounselorBatch.batch_code)
    )
    return list(result.scalars().all())


async def get_counselor_batch_ids(
    db: AsyncSession,
    counselor_user_id: UUID,
) -> list[UUID]:
    batches = await get_counselor_batches(db, counselor_user_id)
    return [b.id for b in batches]


async def get_counselor_student_ids(
    db: AsyncSession,
    counselor_user_id: UUID,
    batch_id: Optional[UUID] = None,
) -> list[UUID]:
    batch_ids = [batch_id] if batch_id else await get_counselor_batch_ids(db, counselor_user_id)
    if not batch_ids:
        return []

    result = await db.execute(
        select(Student.id).where(Student.batch_id.in_(batch_ids))
    )
    return list(result.scalars().all())


async def counselor_owns_batch(
    db: AsyncSession,
    counselor_user_id: UUID,
    batch_id: UUID,
) -> bool:
    result = await db.execute(
        select(CounselorBatch.id).where(
            CounselorBatch.id == batch_id,
            CounselorBatch.counselor_id == counselor_user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def list_all_batches(db: AsyncSession) -> list[dict]:
    """Admin view: all batches with counselor name and student count."""
    from app.models.user import User as UserModel

    rows = await db.execute(
        select(
            CounselorBatch,
            UserModel.name.label("counselor_name"),
            UserModel.email.label("counselor_email"),
            func.count(Student.id).label("student_count"),
        )
        .join(UserModel, CounselorBatch.counselor_id == UserModel.id)
        .outerjoin(Student, Student.batch_id == CounselorBatch.id)
        .group_by(CounselorBatch.id, UserModel.name, UserModel.email)
        .order_by(CounselorBatch.intake_year.desc(), CounselorBatch.batch_code)
    )
    out = []
    for batch, counselor_name, counselor_email, student_count in rows.all():
        out.append({
            "id": str(batch.id),
            "name": batch.name,
            "intake_year": batch.intake_year,
            "batch_code": batch.batch_code,
            "counselor_id": str(batch.counselor_id),
            "counselor_name": counselor_name,
            "counselor_email": counselor_email,
            "target_size": batch.target_size,
            "student_count": student_count or 0,
            "created_at": batch.created_at.isoformat(),
        })
    return out


async def batch_to_summary(db: AsyncSession, batch: CounselorBatch) -> dict:
    count_q = await db.execute(
        select(func.count(Student.id)).where(Student.batch_id == batch.id)
    )
    student_count = count_q.scalar() or 0
    from app.models.user import User
    counselor_q = await db.execute(select(User).where(User.id == batch.counselor_id))
    counselor = counselor_q.scalar_one_or_none()
    return {
        "id": str(batch.id),
        "name": batch.name,
        "intake_year": batch.intake_year,
        "batch_code": batch.batch_code,
        "counselor_id": str(batch.counselor_id),
        "counselor_name": counselor.name if counselor else None,
        "target_size": batch.target_size,
        "student_count": student_count,
        "created_at": batch.created_at.isoformat(),
    }


async def get_batch_students_detail(db: AsyncSession, batch_id: UUID) -> list[dict]:
    students_q = await db.execute(
        select(Student).where(Student.batch_id == batch_id).order_by(Student.roll_no)
    )
    students = students_q.scalars().all()
    result = []
    for s in students:
        corr = await get_student_correlation(db, s.id)
        open_alerts_q = await db.execute(
            select(func.count(Alert.id)).where(
                Alert.student_id == s.id,
                Alert.resolved == False,  # noqa: E712
            )
        )
        open_alerts = open_alerts_q.scalar() or 0
        result.append({
            "id": str(s.id),
            "student_id": s.student_id,
            "name": s.name,
            "roll_no": s.roll_no,
            "email": s.email,
            "department": s.department,
            "attendance_pct": corr.get("attendance_pct", 0),
            "avg_attention": corr.get("avg_attention", 0),
            "correlation_flag": corr.get("correlation_flag", "healthy"),
            "open_alerts": open_alerts,
        })
    return result


async def _get_or_create_batch(
    db: AsyncSession,
    *,
    intake_year: int,
    batch_code: str,
    counselor_id: UUID,
    batches_created: set[UUID],
) -> CounselorBatch:
    existing = await db.execute(
        select(CounselorBatch).where(
            CounselorBatch.intake_year == intake_year,
            CounselorBatch.batch_code == batch_code,
            CounselorBatch.counselor_id == counselor_id,
        )
    )
    batch = existing.scalar_one_or_none()
    if batch:
        return batch

    batch = CounselorBatch(
        name=f"{intake_year} Intake — Group {batch_code}",
        intake_year=intake_year,
        batch_code=batch_code,
        counselor_id=counselor_id,
    )
    db.add(batch)
    await db.flush()
    batches_created.add(batch.id)
    return batch


async def _resolve_counselor(db: AsyncSession, email: str) -> Optional[User]:
    email = email.strip().lower()
    result = await db.execute(
        select(User).where(
            func.lower(User.email) == email,
            User.role == UserRole.counselor,
        )
    )
    return result.scalar_one_or_none()


async def _resolve_student(
    db: AsyncSession,
    row: dict,
) -> tuple[Optional[Student], bool]:
    """Return (student, created)."""
    sid = row.get("student_id", "").strip()
    roll = row.get("roll_no", "").strip()

    if sid:
        by_sid = await db.execute(select(Student).where(Student.student_id == sid))
        student = by_sid.scalar_one_or_none()
        if student:
            return student, False

    if roll:
        by_roll = await db.execute(select(Student).where(Student.roll_no == roll))
        student = by_roll.scalar_one_or_none()
        if student:
            return student, False

    name = row.get("name", "").strip()
    if not name or not roll or not sid:
        return None, False

    data = StudentCreate(
        name=name,
        roll_no=roll,
        student_id=sid,
        email=row.get("email", "").strip() or None,
        department=row.get("department", "").strip() or None,
    )
    student = await student_service.create_student(db, data)
    return student, True


async def import_batches_csv(db: AsyncSession, file_bytes: bytes) -> dict:
    """
    CSV columns: intake_year, batch_code, counselor_email, student_id,
                 roll_no, name, email, department
    """
    batches_created: set[UUID] = set()
    students_assigned = 0
    students_created = 0
    skipped = 0
    errors: list[str] = []
    warnings: list[str] = []
    batch_counts: dict[UUID, int] = {}

    try:
        text = file_bytes.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
    except Exception as exc:
        return {"imported": 0, "batches_created": 0, "students_assigned": 0,
                "students_created": 0, "skipped": 0, "errors": [f"Could not parse CSV: {exc}"],
                "warnings": []}

    if not reader.fieldnames or not CSV_REQUIRED.issubset({c.strip() for c in reader.fieldnames}):
        return {
            "batches_created": 0,
            "students_assigned": 0,
            "students_created": 0,
            "skipped": 0,
            "errors": [f"CSV must have columns: {CSV_REQUIRED}. Found: {reader.fieldnames}"],
            "warnings": [],
        }

    for i, raw_row in enumerate(reader, start=2):
        row = {k.strip(): (v or "").strip() for k, v in raw_row.items() if k}
        try:
            intake_year = int(row.get("intake_year", ""))
            batch_code = row.get("batch_code", "")
            counselor_email = row.get("counselor_email", "")
            if not batch_code or not counselor_email:
                errors.append(f"Row {i}: intake_year, batch_code, and counselor_email are required")
                skipped += 1
                continue

            counselor = await _resolve_counselor(db, counselor_email)
            if not counselor:
                errors.append(f"Row {i}: no counselor user with email '{counselor_email}'")
                skipped += 1
                continue

            batch = await _get_or_create_batch(
                db,
                intake_year=intake_year,
                batch_code=batch_code,
                counselor_id=counselor.id,
                batches_created=batches_created,
            )

            student, created = await _resolve_student(db, row)
            if not student:
                errors.append(f"Row {i}: student not found and insufficient data to create")
                skipped += 1
                continue

            if created:
                students_created += 1

            if student.batch_id and student.batch_id != batch.id:
                from app.models.audit_log import AuditLog
                db.add(AuditLog(
                    action="batch_reassign",
                    entity_type="student",
                    entity_id=str(student.id),
                    old_value={"batch_id": str(student.batch_id)},
                    new_value={"batch_id": str(batch.id)},
                ))

            student.batch_id = batch.id
            db.add(student)
            students_assigned += 1
            batch_counts[batch.id] = batch_counts.get(batch.id, 0) + 1

        except Exception as exc:
            errors.append(f"Row {i}: {exc}")
            skipped += 1

    await db.commit()

    for batch_id, count in batch_counts.items():
        batch_res = await db.execute(select(CounselorBatch).where(CounselorBatch.id == batch_id))
        batch = batch_res.scalar_one_or_none()
        if batch and count > batch.target_size + 5:
            warnings.append(
                f"Batch {batch.name} has {count} students (target ~{batch.target_size})"
            )

    return {
        "batches_created": len(batches_created),
        "students_assigned": students_assigned,
        "students_created": students_created,
        "skipped": skipped,
        "errors": errors,
        "warnings": warnings,
    }


async def scope_for_user(
    db: AsyncSession,
    user,
    batch_id: Optional[UUID] = None,
) -> Optional[list[UUID]]:
    """
    Counselor: list of student UUIDs in scope (empty if none).
    Admin/teacher: None (no filter).
    """
    from app.models.user import UserRole

    if user.role != UserRole.counselor:
        return None
    if batch_id:
        if not await counselor_owns_batch(db, user.id, batch_id):
            return []
        return await get_counselor_student_ids(db, user.id, batch_id)
    return await get_counselor_student_ids(db, user.id)
