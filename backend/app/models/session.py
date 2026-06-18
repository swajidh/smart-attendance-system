import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class SessionStatus(str, PyEnum):
    active = "active"
    closed = "closed"
    cancelled = "cancelled"


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Human-readable session identifier (e.g. "SES-20260618-001")
    session_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="sessionstatus"),
        nullable=False,
        default=SessionStatus.active,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Snapshot counts computed on close
    total_enrolled: Mapped[int] = mapped_column(default=0, nullable=False)
    total_present: Mapped[int] = mapped_column(default=0, nullable=False)
    total_absent: Mapped[int] = mapped_column(default=0, nullable=False)
    total_unknown: Mapped[int] = mapped_column(default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    course = relationship("Course", back_populates="sessions")
    attendance_records = relationship("Attendance", back_populates="session", cascade="all, delete-orphan")
    attention_logs = relationship("AttentionLog", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Session {self.session_id} ({self.status})>"
