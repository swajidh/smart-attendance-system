"""Add exam monitoring tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c8d5e2f1a4b7"
down_revision = "b7e4f1a2c3d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "exam_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("exam_code", sa.String(length=50), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("room_name", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "scheduled",
                "calibrating",
                "active",
                "closed",
                "cancelled",
                name="examsessionstatus",
            ),
            nullable=False,
        ),
        sa.Column("started_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("calibration_complete", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("baseline_yaw", sa.Float(), nullable=True),
        sa.Column("baseline_pitch", sa.Float(), nullable=True),
        sa.Column("total_violations", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("students_flagged", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("phones_detected", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["started_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_exam_sessions_exam_code"), "exam_sessions", ["exam_code"], unique=True)
    op.create_index(op.f("ix_exam_sessions_course_id"), "exam_sessions", ["course_id"], unique=False)

    op.create_table(
        "exam_calibrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("exam_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("baseline_yaw", sa.Float(), nullable=True),
        sa.Column("baseline_pitch", sa.Float(), nullable=True),
        sa.Column("per_student_samples", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exam_session_id"], ["exam_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_exam_calibrations_exam_session_id"),
        "exam_calibrations",
        ["exam_session_id"],
        unique=True,
    )

    op.create_table(
        "exam_violations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("exam_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "violation_type",
            sa.Enum(
                "gaze_away",
                "face_absent",
                "multiple_faces",
                "phone_detected",
                "unauthorized_object",
                "smartwatch_suspected",
                "unknown_face",
                name="examviolationtype",
            ),
            nullable=False,
        ),
        sa.Column(
            "severity",
            sa.Enum("low", "medium", "high", "critical", name="examviolationseverity"),
            nullable=False,
        ),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("sustained_seconds", sa.Float(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("snapshot_path", sa.String(length=500), nullable=True),
        sa.Column("bbox", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "review_status",
            sa.Enum("pending", "confirmed", "dismissed", name="examreviewstatus"),
            nullable=False,
        ),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exam_session_id"], ["exam_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_exam_violations_exam_session_id"), "exam_violations", ["exam_session_id"])
    op.create_index(op.f("ix_exam_violations_student_id"), "exam_violations", ["student_id"])
    op.create_index(op.f("ix_exam_violations_violation_type"), "exam_violations", ["violation_type"])
    op.create_index(op.f("ix_exam_violations_review_status"), "exam_violations", ["review_status"])
    op.create_index(op.f("ix_exam_violations_created_at"), "exam_violations", ["created_at"])


def downgrade() -> None:
    op.drop_table("exam_violations")
    op.drop_table("exam_calibrations")
    op.drop_table("exam_sessions")
    op.execute("DROP TYPE IF EXISTS examreviewstatus")
    op.execute("DROP TYPE IF EXISTS examviolationseverity")
    op.execute("DROP TYPE IF EXISTS examviolationtype")
    op.execute("DROP TYPE IF EXISTS examsessionstatus")
