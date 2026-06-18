import uuid
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class CourseCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    slots: Optional[List[Any]] = Field(default_factory=list)


class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    slots: Optional[List[Any]] = None


class CourseResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    slots: Optional[List[Any]] = None
    instructor_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CourseEnrollRequest(BaseModel):
    student_id: uuid.UUID
