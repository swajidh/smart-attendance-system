"""
Student service — CRUD, face enrollment, bulk import, re-enrollment.

Embedding storage: the mean embedding of all accepted samples is stored as a
JSON array in Student.embedding (JSONB column). The raw per-sample embeddings
are discarded after averaging to save space; enrollment_samples records how
many were used.
"""

from __future__ import annotations
import csv
import io
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.student import Student, EmbeddingStatus
from app.models.audit_log import AuditLog
from app.schemas.student import StudentCreate, StudentUpdate

from ml.quality_validator import validate_base64, QualityStatus
from ml.face_encoder import get_embedding_from_base64, average_embeddings

logger = logging.getLogger(__name__)

MIN_VALID_SAMPLES = 10  # minimum accepted images for enrollment


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_student(db: AsyncSession, data: StudentCreate) -> Student:
    # Reject duplicate student_id / roll_no
    dup = await db.execute(
        select(Student).where(
            (Student.student_id == data.student_id) | (Student.roll_no == data.roll_no)
        )
    )
    if dup.scalar_one_or_none():
        raise ValueError(f"Student ID '{data.student_id}' or roll number '{data.roll_no}' already exists")

    student = Student(**data.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def get_students(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department: Optional[str] = None,
) -> list[Student]:
    q = select(Student)
    if search:
        like = f"%{search}%"
        q = q.where(
            Student.name.ilike(like)
            | Student.student_id.ilike(like)
            | Student.roll_no.ilike(like)
            | Student.email.ilike(like)
        )
    if department:
        q = q.where(Student.department.ilike(f"%{department}%"))
    q = q.order_by(Student.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


async def get_student(db: AsyncSession, student_id: UUID) -> Optional[Student]:
    result = await db.execute(select(Student).where(Student.id == student_id))
    return result.scalar_one_or_none()


async def update_student(db: AsyncSession, student: Student, data: StudentUpdate) -> Student:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def delete_student(db: AsyncSession, student: Student) -> None:
    await db.delete(student)
    await db.commit()


# ── Face enrollment ───────────────────────────────────────────────────────────

async def enroll_face(
    db: AsyncSession,
    student: Student,
    images_b64: list[str],
    re_enroll: bool = False,
) -> dict:
    """
    Validate quality → generate embeddings → average → persist.
    Returns a result dict consumed by the route handler.
    """
    accepted_embeddings: list[list[float]] = []
    errors: list[str] = []

    for i, b64 in enumerate(images_b64):
        label = f"Image {i + 1}"

        # Quality check
        quality = validate_base64(b64)
        if not quality.ok:
            errors.append(f"{label}: {quality.message}")
            continue

        # Embedding
        embedding = get_embedding_from_base64(b64)
        if embedding is None:
            errors.append(f"{label}: Could not generate embedding (no face detected by encoder)")
            continue

        accepted_embeddings.append(embedding)

    if len(accepted_embeddings) < MIN_VALID_SAMPLES:
        return {
            "status": "error",
            "message": (
                f"Only {len(accepted_embeddings)} of {len(images_b64)} images passed quality checks. "
                f"Minimum {MIN_VALID_SAMPLES} required."
            ),
            "samples_accepted": len(accepted_embeddings),
            "samples_rejected": len(images_b64) - len(accepted_embeddings),
            "embedding_status": EmbeddingStatus.failed,
            "errors": errors,
        }

    mean_embedding = average_embeddings(accepted_embeddings)

    # If re-enrolling, log to audit before overwriting
    if re_enroll and student.embedding:
        audit = AuditLog(
            action="re_enroll_face",
            entity_type="student",
            entity_id=str(student.id),
            old_value={"embedding_status": student.embedding_status.value,
                       "enrollment_samples": student.enrollment_samples},
            new_value={"samples_accepted": len(accepted_embeddings)},
        )
        db.add(audit)

    student.embedding = mean_embedding
    student.embedding_status = EmbeddingStatus.enrolled
    student.enrollment_date = datetime.now(timezone.utc)
    student.enrollment_samples = len(accepted_embeddings)
    db.add(student)
    await db.commit()
    await db.refresh(student)

    return {
        "status": "success",
        "message": f"Enrolled {student.name} with {len(accepted_embeddings)} valid samples.",
        "samples_accepted": len(accepted_embeddings),
        "samples_rejected": len(images_b64) - len(accepted_embeddings),
        "embedding_status": EmbeddingStatus.enrolled,
        "errors": errors,
    }


# ── Bulk CSV import ───────────────────────────────────────────────────────────

async def bulk_import_csv(db: AsyncSession, file_bytes: bytes) -> dict:
    """
    Expected CSV columns (header row required):
      name, roll_no, student_id, email, department, phone
    """
    imported = 0
    skipped = 0
    errors: list[str] = []

    try:
        text = file_bytes.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
    except Exception as exc:
        return {"imported": 0, "skipped": 0, "errors": [f"Could not parse CSV: {exc}"]}

    required = {"name", "roll_no", "student_id"}
    if reader.fieldnames and not required.issubset(set(reader.fieldnames)):
        return {
            "imported": 0,
            "skipped": 0,
            "errors": [f"CSV must have columns: {required}. Found: {reader.fieldnames}"],
        }

    for i, row in enumerate(reader, start=2):  # row 1 = header
        try:
            data = StudentCreate(
                name=row.get("name", "").strip(),
                roll_no=row.get("roll_no", "").strip(),
                student_id=row.get("student_id", "").strip(),
                email=row.get("email", "").strip() or None,
                department=row.get("department", "").strip() or None,
                phone=row.get("phone", "").strip() or None,
            )
        except Exception as exc:
            errors.append(f"Row {i}: validation error — {exc}")
            skipped += 1
            continue

        try:
            await create_student(db, data)
            imported += 1
        except ValueError as exc:
            errors.append(f"Row {i} ({data.student_id}): {exc}")
            skipped += 1
        except Exception as exc:
            errors.append(f"Row {i}: unexpected error — {exc}")
            skipped += 1

    return {"imported": imported, "skipped": skipped, "errors": errors}
