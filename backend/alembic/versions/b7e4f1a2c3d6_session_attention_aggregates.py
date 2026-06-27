"""Add session-level attention aggregates computed on close."""

from alembic import op
import sqlalchemy as sa

revision = "b7e4f1a2c3d6"
down_revision = "a3f8c2b1d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("avg_class_attention", sa.Float(), nullable=True))
    op.add_column("sessions", sa.Column("attention_samples", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "attention_samples")
    op.drop_column("sessions", "avg_class_attention")
