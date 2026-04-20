from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MarkAttendanceRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    student_id: str = Field(min_length=1, max_length=64)
    marked_at: datetime | None = None


class MarkAttendanceResponse(BaseModel):
    student_id: str
    marked_at: datetime
    already_marked: bool


class AttendanceTodayItem(BaseModel):
    student_id: str
    name: str
    marked_at: datetime


class AttendanceTodayResponse(BaseModel):
    items: list[AttendanceTodayItem]
