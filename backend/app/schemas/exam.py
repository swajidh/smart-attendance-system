from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ExamCreateRequest(BaseModel):
    course_id: UUID
    room_name: str = Field(default="Exam Hall", max_length=100)


class ExamSessionResponse(BaseModel):
    id: UUID
    exam_code: str
    course_id: UUID
    room_name: str
    status: str
    calibration_complete: bool
    baseline_yaw: Optional[float] = None
    baseline_pitch: Optional[float] = None
    total_violations: int
    students_flagged: int
    phones_detected: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExamViolationResponse(BaseModel):
    id: UUID
    exam_session_id: UUID
    student_id: Optional[UUID] = None
    student_name: Optional[str] = None
    violation_type: str
    severity: str
    confidence: float
    sustained_seconds: float
    message: str
    snapshot_path: Optional[str] = None
    review_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ExamViolationReviewRequest(BaseModel):
    review_status: str = Field(pattern="^(confirmed|dismissed)$")
    review_note: Optional[str] = None


class ExamDashboardResponse(BaseModel):
    active_exams: int
    violations_7d: int
    pending_reviews: int
    phones_7d: int
