import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.student import EmbeddingStatus


class StudentCreate(BaseModel):
    name: str
    roll_no: str
    student_id: str
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    phone: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    phone: Optional[str] = None


class StudentResponse(BaseModel):
    id: uuid.UUID
    student_id: str
    name: str
    roll_no: str
    email: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    embedding_status: EmbeddingStatus
    enrollment_date: Optional[datetime] = None
    enrollment_samples: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EnrollFaceRequest(BaseModel):
    images: list[str]  # list of base64-encoded JPEG/PNG images


class EnrollFaceResponse(BaseModel):
    status: str
    message: str
    samples_accepted: int
    samples_rejected: int
    embedding_status: EmbeddingStatus
    errors: list[str] = []


class QualityCheckRequest(BaseModel):
    image: str  # single base64 image


class QualityCheckResponse(BaseModel):
    quality: str          # "ok" | "blurry" | "too_dark" | "too_bright" | "no_face" | "multiple_faces"
    blur_score: float
    brightness: float
    face_detected: bool
    message: str


class BulkImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[str] = []


class ReEnrollResponse(BaseModel):
    status: str
    message: str
    samples_accepted: int
