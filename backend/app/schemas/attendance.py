from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus, SessionStatus


class CreateSessionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    course_code: str = Field(min_length=2, max_length=32)
    room: str | None = Field(default=None, max_length=64)


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    course_code: str
    room: str | None
    status: SessionStatus
    started_at: datetime | None
    closed_at: datetime | None
    created_by_id: UUID


class MarkAttendanceRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    student_id: UUID | None = None
    student_external_id: str | None = Field(default=None, max_length=64)
    status: AttendanceStatus = AttendanceStatus.PRESENT
    source: str = Field(default="manual", max_length=32)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    notes: str | None = Field(default=None, max_length=500)


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    session_id: UUID
    student_id: UUID
    status: AttendanceStatus
    marked_at: datetime
    source: str
    confidence: float | None
    notes: str | None
