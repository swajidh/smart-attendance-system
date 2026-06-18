import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class EmbeddingStatus(str, PyEnum):
    not_enrolled = "not_enrolled"
    enrolled = "enrolled"
    failed = "failed"


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    roll_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Face recognition data
    embedding: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    embedding_status: Mapped[EmbeddingStatus] = mapped_column(
        Enum(EmbeddingStatus, name="embeddingstatus"),
        nullable=False,
        default=EmbeddingStatus.not_enrolled,
    )
    enrollment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    enrollment_samples: Mapped[int] = mapped_column(default=0, nullable=False)

    # Optional link to a User account (for self-registration)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="student_record", foreign_keys=[user_id])
    course_enrollments = relationship("CourseStudent", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    attention_logs = relationship("AttentionLog", back_populates="student", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="student", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Student {self.student_id} — {self.name}>"
