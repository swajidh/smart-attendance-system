"""
Student REST API — /api/v1/students

GET    /students                    list students (search, dept, skip, limit)
POST   /students                    create student record
GET    /students/{id}               get student by UUID
PUT    /students/{id}               update student
DELETE /students/{id}               delete student

POST   /students/validate-frame     single-frame quality check (no auth required
                                    so WebcamCapture can call it unauthenticated)
POST   /students/bulk-import        CSV import
POST   /students/{id}/enroll-face   webcam enrollment (≥10 valid frames)
POST   /students/{id}/re-enroll     clear + re-enroll
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, get_current_user, require_admin, require_role
from app.models.user import User, UserRole
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    EnrollFaceRequest,
    EnrollFaceResponse,
    QualityCheckRequest,
    QualityCheckResponse,
    BulkImportResponse,
    ReEnrollResponse,
)
from app.services import student_service
from app.models.student import EmbeddingStatus

router = APIRouter(prefix="/students", tags=["students"])

_require_teacher_or_admin = require_role(UserRole.teacher, UserRole.admin)


# ── Quality check (open — used by WebcamCapture during capture) ───────────────

@router.post("/validate-frame", response_model=QualityCheckResponse)
async def validate_frame(body: QualityCheckRequest):
    """Real-time quality check for a single webcam frame. No auth required."""
    from ml.quality_validator import validate_base64
    result = validate_base64(body.image)
    return QualityCheckResponse(
        quality=result.status,
        blur_score=round(result.blur_score, 2),
        brightness=round(result.brightness, 2),
        face_detected=result.face_count >= 1,
        message=result.message,
    )


# ── Bulk import ───────────────────────────────────────────────────────────────

@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    """Import students from a CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")
    content = await file.read()
    result = await student_service.bulk_import_csv(db, content)
    return BulkImportResponse(**result)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[StudentResponse])
async def list_students(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    department: str | None = None,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    students = await student_service.get_students(
        db, skip=skip, limit=limit, search=search, department=department
    )
    return students


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    try:
        return await student_service.create_student(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    student = await student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    student = await student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return await student_service.update_student(db, student, data)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_admin),
):
    student = await student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await student_service.delete_student(db, student)


# ── Face enrollment ───────────────────────────────────────────────────────────

@router.post("/{student_id}/enroll-face", response_model=EnrollFaceResponse)
async def enroll_face(
    student_id: UUID,
    body: EnrollFaceRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    """Enroll facial embeddings for an existing student."""
    student = await student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not body.images:
        raise HTTPException(status_code=400, detail="No images provided")

    result = await student_service.enroll_face(db, student, body.images)
    return EnrollFaceResponse(**result)


@router.post("/{student_id}/re-enroll", response_model=ReEnrollResponse)
async def re_enroll(
    student_id: UUID,
    body: EnrollFaceRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    """Clear previous embeddings and re-enroll with new images."""
    student = await student_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not body.images:
        raise HTTPException(status_code=400, detail="No images provided")

    result = await student_service.enroll_face(db, student, body.images, re_enroll=True)
    return ReEnrollResponse(
        status=result["status"],
        message=result["message"],
        samples_accepted=result["samples_accepted"],
    )
