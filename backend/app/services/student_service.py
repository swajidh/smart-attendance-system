from __future__ import annotations

import imghdr
import mimetypes
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.schemas.student import RegisterStudentRequest, StudentResponse
from app.utils.exceptions import AppException

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class StudentService:
    async def register_student(
        self,
        *,
        db: AsyncSession,
        student_id: str,
        name: str,
        image_file: UploadFile,
    ) -> StudentResponse:
        body = RegisterStudentRequest.model_validate({"student_id": student_id, "name": name})

        if not image_file.content_type or not image_file.content_type.startswith("image/"):
            raise AppException(
                status_code=400,
                message="Invalid image file",
                code="INVALID_IMAGE_MIME_TYPE",
                detail=f"content_type={image_file.content_type}",
            )

        contents = await image_file.read()
        if not contents:
            raise AppException(status_code=400, message="Image file is empty", code="EMPTY_IMAGE")
        if len(contents) > MAX_UPLOAD_BYTES:
            raise AppException(
                status_code=400,
                message="Image file too large",
                code="IMAGE_TOO_LARGE",
                detail=f"max_bytes={MAX_UPLOAD_BYTES}",
            )

        if imghdr.what(None, h=contents) is None:
            raise AppException(status_code=400, message="Corrupted image file", code="INVALID_IMAGE_BYTES")

        student_upload_dir = self._baseline_dir(body.student_id)
        student_upload_dir.mkdir(parents=True, exist_ok=True)

        ext = mimetypes.guess_extension(image_file.content_type) or ".jpg"
        file_path = student_upload_dir / f"{uuid.uuid4().hex}{ext}"
        file_path.write_bytes(contents)

        result = await db.execute(select(Student).where(Student.student_id == body.student_id))
        student = result.scalars().first()
        if student is None:
            student = Student(student_id=body.student_id, name=body.name)
            db.add(student)
        else:
            student.name = body.name

        await db.flush()
        await db.refresh(student)

        return StudentResponse(
            id=student.id,
            student_id=student.student_id,
            name=student.name,
            created_at=student.created_at,
            updated_at=student.updated_at,
        )

    def _baseline_dir(self, student_id: str) -> Path:
        repo_root = Path(__file__).resolve().parents[3]
        return repo_root / "data" / "uploads" / "baseline_photos" / student_id


student_service = StudentService()
