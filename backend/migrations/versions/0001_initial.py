"""Initial students and attendance logs schema."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("LENGTH(name) > 0", name="ck_students_name_nonempty"),
        sa.CheckConstraint("LENGTH(student_id) > 0", name="ck_students_student_id_nonempty"),
        sa.PrimaryKeyConstraint("id", name="pk_students"),
        sa.UniqueConstraint("student_id", name="uq_students_student_id"),
    )
    op.create_index("ix_students_student_id", "students", ["student_id"], unique=False)

    op.create_table(
        "attendance_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("marked_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("source_frame_ts", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("marked_at IS NOT NULL", name="ck_attendance_logs_marked_at_not_null"),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            name="fk_attendance_logs_student_id_students",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_attendance_logs"),
    )
    op.create_index("ix_attendance_logs_student_id", "attendance_logs", ["student_id"], unique=False)
    op.create_index(
        "idx_attendance_logs_student_id_marked_at",
        "attendance_logs",
        ["student_id", "marked_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_attendance_logs_student_id_marked_at", table_name="attendance_logs")
    op.drop_index("ix_attendance_logs_student_id", table_name="attendance_logs")
    op.drop_table("attendance_logs")
    op.drop_index("ix_students_student_id", table_name="students")
    op.drop_table("students")
