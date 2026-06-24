import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class AttentionLog(Base):
    __tablename__ = "attention_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Attention score 0–100 (smoothed)
    score: Mapped[float] = mapped_column(Float, nullable=False)

    # Raw head pose data: {"yaw": float, "pitch": float, "roll": float}
    head_pose: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Posture state: "alert", "slouching", "sleeping"
    posture: Mapped[str | None] = mapped_column(JSONB, nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True
    )

    # Relationships
    session = relationship("Session", back_populates="attention_logs")
    student = relationship("Student", back_populates="attention_logs")

    def __repr__(self) -> str:
        return f"<AttentionLog session={self.session_id} student={self.student_id} score={self.score}>"
