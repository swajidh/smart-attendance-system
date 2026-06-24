"""
Counselor batch management API.

GET  /batches              list all batches (admin)
GET  /batches/mine         counselor's assigned batches
GET  /batches/{id}/students roster with stats
POST /batches/import-csv   admin CSV upload
GET  /batches/import-template  CSV template download
"""

from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_db_session,
    get_current_user,
    require_batches_read,
    require_batches_manage,
    require_system_admin,
)
from app.models.user import User, UserRole
from app.services import batch_service

router = APIRouter(prefix="/batches", tags=["batches"])

CSV_TEMPLATE = """intake_year,batch_code,counselor_email,student_id,roll_no,name,email,department
2026,A,counselor@school.edu,STU-2026-001,R001,Jane Doe,jane@school.edu,Computer Science
"""


@router.get("")
async def list_batches(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_system_admin),
):
    """List all counselor batches (admin)."""
    return await batch_service.list_all_batches(db)


@router.get("/mine")
async def my_batches(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_batches_read),
):
    """Batches assigned to the logged-in counselor."""
    if current_user.role != UserRole.counselor:
        if current_user.role == UserRole.admin:
            return await batch_service.list_all_batches(db)
        raise HTTPException(status_code=403, detail="Counselors only")

    batches = await batch_service.get_counselor_batches(db, current_user.id)
    result = []
    for b in batches:
        result.append(await batch_service.batch_to_summary(db, b))
    return result


@router.get("/import-template")
async def download_template(
    current_user: User = Depends(require_batches_manage),
):
    return Response(
        content=CSV_TEMPLATE,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=batch_assignment_template.csv"},
    )


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_batches_manage),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")
    content = await file.read()
    return await batch_service.import_batches_csv(db, content)


@router.get("/{batch_id}/students")
async def batch_students(
    batch_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_batches_read),
):
    from app.models.counselor_batch import CounselorBatch
    from sqlalchemy import select

    batch_q = await db.execute(select(CounselorBatch).where(CounselorBatch.id == batch_id))
    batch = batch_q.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if current_user.role == UserRole.counselor:
        if not await batch_service.counselor_owns_batch(db, current_user.id, batch_id):
            raise HTTPException(status_code=403, detail="Not your batch")

    summary = await batch_service.batch_to_summary(db, batch)
    students = await batch_service.get_batch_students_detail(db, batch_id)
    return {**summary, "students": students}
