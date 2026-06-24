"""counselor_batches

Revision ID: a3f8c2b1d4e5
Revises: 1ea2ebddea77
Create Date: 2026-06-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a3f8c2b1d4e5"
down_revision: Union[str, None] = "1ea2ebddea77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "counselor_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("intake_year", sa.Integer(), nullable=False),
        sa.Column("batch_code", sa.String(50), nullable=False),
        sa.Column("counselor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_size", sa.Integer(), nullable=False, server_default="40"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("intake_year", "batch_code", "counselor_id", name="uq_counselor_batch_intake_code"),
    )
    op.create_index("ix_counselor_batches_intake_year", "counselor_batches", ["intake_year"])
    op.create_index("ix_counselor_batches_counselor_id", "counselor_batches", ["counselor_id"])

    op.add_column(
        "students",
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("counselor_batches.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_students_batch_id", "students", ["batch_id"])


def downgrade() -> None:
    op.drop_index("ix_students_batch_id", table_name="students")
    op.drop_column("students", "batch_id")
    op.drop_index("ix_counselor_batches_counselor_id", table_name="counselor_batches")
    op.drop_index("ix_counselor_batches_intake_year", table_name="counselor_batches")
    op.drop_table("counselor_batches")
