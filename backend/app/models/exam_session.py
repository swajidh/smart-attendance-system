import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum, Float, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class ExamSessionStatus(str, PyEnum):
    scheduled = "scheduled"
    calibrating = "calibrating"
    active = "active"
    closed = "closed"
    cancelled = "cancelled"


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    exam_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Exam Hall")
    status: Mapped[ExamSessionStatus] = mapped_column(
        Enum(ExamSessionStatus, name="examsessionstatus"),
        nullable=False,
        default=ExamSessionStatus.scheduled,
    )
    started_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    calibration_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    baseline_yaw: Mapped[float | None] = mapped_column(Float, nullable=True)
    baseline_pitch: Mapped[float | None] = mapped_column(Float, nullable=True)

    total_violations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    students_flagged: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    phones_detected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    course = relationship("Course", back_populates="exam_sessions")
    started_by_user = relationship("User", foreign_keys=[started_by])
    violations = relationship("ExamViolation", back_populates="exam_session", cascade="all, delete-orphan")
    calibration = relationship(
        "ExamCalibration", back_populates="exam_session", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ExamSession {self.exam_code} ({self.status})>"
