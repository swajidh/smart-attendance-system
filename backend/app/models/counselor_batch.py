import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.models import Base


class CounselorBatch(Base):
    __tablename__ = "counselor_batches"
    __table_args__ = (
        UniqueConstraint("intake_year", "batch_code", "counselor_id", name="uq_counselor_batch_intake_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    intake_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    batch_code: Mapped[str] = mapped_column(String(50), nullable=False)
    counselor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_size: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    counselor = relationship("User", back_populates="counselor_batches")
    students = relationship("Student", back_populates="counselor_batch")

    def __repr__(self) -> str:
        return f"<CounselorBatch {self.intake_year}-{self.batch_code}>"
