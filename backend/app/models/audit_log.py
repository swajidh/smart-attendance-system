import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    old_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True
    )

    # Relationships
    user = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} on {self.entity_type}/{self.entity_id}>"
