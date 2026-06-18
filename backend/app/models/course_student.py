import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class CourseStudent(Base):
    """Many-to-many junction between Course and Student."""

    __tablename__ = "course_students"
    __table_args__ = (
        UniqueConstraint("course_id", "student_id", name="uq_course_student"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    course = relationship("Course", back_populates="student_enrollments")
    student = relationship("Student", back_populates="course_enrollments")

    def __repr__(self) -> str:
        return f"<CourseStudent course={self.course_id} student={self.student_id}>"
