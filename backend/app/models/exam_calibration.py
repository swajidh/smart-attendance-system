import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class ExamCalibration(Base):
    """Room baseline pose statistics captured during exam calibration phase."""

    __tablename__ = "exam_calibrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    exam_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    sample_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    baseline_yaw: Mapped[float | None] = mapped_column(Float, nullable=True)
    baseline_pitch: Mapped[float | None] = mapped_column(Float, nullable=True)
    per_student_samples: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    exam_session = relationship("ExamSession", back_populates="calibration")
