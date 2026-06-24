import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.session import SessionStatus
from app.models.attendance import AttendanceStatus, MarkedBy


class SessionCreate(BaseModel):
    course_id: uuid.UUID


class SessionStats(BaseModel):
    total_enrolled: int = 0
    total_present: int = 0
    total_absent: int = 0
    total_unknown: int = 0


class SessionResponse(BaseModel):
    id: uuid.UUID
    session_id: str
    course_id: uuid.UUID
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    status: SessionStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    stats: SessionStats

    model_config = {"from_attributes": True}


class AttendanceRecordResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    student_id: uuid.UUID
    student_name: Optional[str] = None
    student_code: Optional[str] = None
    roll_no: Optional[str] = None
    status: AttendanceStatus
    confidence: Optional[float] = None
    first_seen: Optional[datetime] = None
    marked_by: MarkedBy
    modified_at: Optional[datetime] = None
    override_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class SessionWithRosterResponse(SessionResponse):
    roster: list[AttendanceRecordResponse] = []


class ManualOverrideRequest(BaseModel):
    status: AttendanceStatus
    reason: Optional[str] = None


class UnknownsResponse(BaseModel):
    session_id: uuid.UUID
    total_unknown_detections: int
    message: str
