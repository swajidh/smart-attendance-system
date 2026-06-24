import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class AlertType(str, PyEnum):
    low_attendance = "low_attendance"
    low_engagement = "low_engagement"
    unknown_face = "unknown_face"
    system = "system"


class AlertSeverity(str, PyEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True
    )
    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType, name="alerttype"), nullable=False, index=True
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alertseverity"), nullable=False, default=AlertSeverity.medium
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True
    )

    # Relationships
    student = relationship("Student", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert {self.alert_type} severity={self.severity} resolved={self.resolved}>"
