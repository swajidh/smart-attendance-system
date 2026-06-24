import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, ForeignKey, Float, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class AttendanceStatus(str, PyEnum):
    present = "present"
    absent = "absent"
    unknown = "unknown"


class MarkedBy(str, PyEnum):
    auto = "auto"
    manual = "manual"


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendancestatus"),
        nullable=False,
        default=AttendanceStatus.absent,
    )
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    marked_by: Mapped[MarkedBy] = mapped_column(
        Enum(MarkedBy, name="markedby"), nullable=False, default=MarkedBy.auto
    )

    # Manual override tracking
    modified_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    override_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    session = relationship("Session", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")
    modified_by_user = relationship("User", back_populates="attendance_modifications", foreign_keys=[modified_by_id])

    def __repr__(self) -> str:
        return f"<Attendance session={self.session_id} student={self.student_id} status={self.status}>"
