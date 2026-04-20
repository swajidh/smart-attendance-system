from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RegisterStudentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    student_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)


class StudentResponse(BaseModel):
    id: str
    student_id: str
    name: str
    created_at: datetime
    updated_at: datetime
