import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum, Float, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class ExamViolationType(str, PyEnum):
    gaze_away = "gaze_away"
    face_absent = "face_absent"
    multiple_faces = "multiple_faces"
    phone_detected = "phone_detected"
    unauthorized_object = "unauthorized_object"
    smartwatch_suspected = "smartwatch_suspected"
    unknown_face = "unknown_face"


class ExamViolationSeverity(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ExamReviewStatus(str, PyEnum):
    pending = "pending"
    confirmed = "confirmed"
    dismissed = "dismissed"


class ExamViolation(Base):
    __tablename__ = "exam_violations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    exam_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True
    )
    violation_type: Mapped[ExamViolationType] = mapped_column(
        Enum(ExamViolationType, name="examviolationtype"), nullable=False, index=True
    )
    severity: Mapped[ExamViolationSeverity] = mapped_column(
        Enum(ExamViolationSeverity, name="examviolationseverity"),
        nullable=False,
        default=ExamViolationSeverity.medium,
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sustained_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    snapshot_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bbox: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    review_status: Mapped[ExamReviewStatus] = mapped_column(
        Enum(ExamReviewStatus, name="examreviewstatus"),
        nullable=False,
        default=ExamReviewStatus.pending,
        index=True,
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True
    )

    exam_session = relationship("ExamSession", back_populates="violations")
    student = relationship("Student", back_populates="exam_violations")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def __repr__(self) -> str:
        return f"<ExamViolation {self.violation_type} severity={self.severity}>"
