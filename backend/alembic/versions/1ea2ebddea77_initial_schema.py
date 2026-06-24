"""initial_schema

Revision ID: 1ea2ebddea77
Revises:
Create Date: 2026-06-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "1ea2ebddea77"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── ENUM types ────────────────────────────────────────────────────────────
    userrole = postgresql.ENUM(
        "admin", "teacher", "counselor", "student",
        name="userrole", create_type=True
    )
    userrole.create(op.get_bind(), checkfirst=True)

    embeddingstatus = postgresql.ENUM(
        "not_enrolled", "enrolled", "failed",
        name="embeddingstatus", create_type=True
    )
    embeddingstatus.create(op.get_bind(), checkfirst=True)

    sessionstatus = postgresql.ENUM(
        "active", "closed", "cancelled",
        name="sessionstatus", create_type=True
    )
    sessionstatus.create(op.get_bind(), checkfirst=True)

    attendancestatus = postgresql.ENUM(
        "present", "absent", "unknown",
        name="attendancestatus", create_type=True
    )
    attendancestatus.create(op.get_bind(), checkfirst=True)

    markedby = postgresql.ENUM(
        "auto", "manual",
        name="markedby", create_type=True
    )
    markedby.create(op.get_bind(), checkfirst=True)

    alerttype = postgresql.ENUM(
        "low_attendance", "low_engagement", "unknown_face", "system",
        name="alerttype", create_type=True
    )
    alerttype.create(op.get_bind(), checkfirst=True)

    alertseverity = postgresql.ENUM(
        "low", "medium", "high", "critical",
        name="alertseverity", create_type=True
    )
    alertseverity.create(op.get_bind(), checkfirst=True)

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", postgresql.ENUM("admin", "teacher", "counselor", "student", name="userrole", create_type=False), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── students ──────────────────────────────────────────────────────────────
    op.create_table(
        "students",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("roll_no", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("department", sa.String(100), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("embedding", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("embedding_model", sa.String(100), nullable=True),
        sa.Column("embedding_status", postgresql.ENUM("not_enrolled", "enrolled", "failed", name="embeddingstatus", create_type=False), nullable=False, server_default="not_enrolled"),
        sa.Column("enrollment_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("enrollment_samples", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id"),
        sa.UniqueConstraint("roll_no"),
    )
    op.create_index("ix_students_student_id", "students", ["student_id"])
    op.create_index("ix_students_email", "students", ["email"])

    # ── courses ───────────────────────────────────────────────────────────────
    op.create_table(
        "courses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("instructor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("slots", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["instructor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_courses_code", "courses", ["code"])

    # ── course_students ───────────────────────────────────────────────────────
    op.create_table(
        "course_students",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "student_id", name="uq_course_student"),
    )
    op.create_index("ix_course_students_course_id", "course_students", ["course_id"])
    op.create_index("ix_course_students_student_id", "course_students", ["student_id"])

    # ── sessions ──────────────────────────────────────────────────────────────
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", sa.String(50), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", postgresql.ENUM("active", "closed", "cancelled", name="sessionstatus", create_type=False), nullable=False, server_default="active"),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_enrolled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_present", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_absent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_unknown", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id"),
    )
    op.create_index("ix_sessions_session_id", "sessions", ["session_id"])
    op.create_index("ix_sessions_course_id", "sessions", ["course_id"])

    # ── attendance ────────────────────────────────────────────────────────────
    op.create_table(
        "attendance",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", postgresql.ENUM("present", "absent", "unknown", name="attendancestatus", create_type=False), nullable=False, server_default="absent"),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("first_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("marked_by", postgresql.ENUM("auto", "manual", name="markedby", create_type=False), nullable=False, server_default="auto"),
        sa.Column("modified_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("modified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("override_reason", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["modified_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attendance_session_id", "attendance", ["session_id"])
    op.create_index("ix_attendance_student_id", "attendance", ["student_id"])

    # ── attention_logs ────────────────────────────────────────────────────────
    op.create_table(
        "attention_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("head_pose", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("posture", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attention_logs_session_id", "attention_logs", ["session_id"])
    op.create_index("ix_attention_logs_student_id", "attention_logs", ["student_id"])
    op.create_index("ix_attention_logs_timestamp", "attention_logs", ["timestamp"])

    # ── alerts ────────────────────────────────────────────────────────────────
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("alert_type", postgresql.ENUM("low_attendance", "low_engagement", "unknown_face", "system", name="alerttype", create_type=False), nullable=False),
        sa.Column("severity", postgresql.ENUM("low", "medium", "high", "critical", name="alertseverity", create_type=False), nullable=False, server_default="medium"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_student_id", "alerts", ["student_id"])
    op.create_index("ix_alerts_alert_type", "alerts", ["alert_type"])
    op.create_index("ix_alerts_resolved", "alerts", ["resolved"])
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])

    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(100), nullable=True),
        sa.Column("old_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("new_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("alerts")
    op.drop_table("attention_logs")
    op.drop_table("attendance")
    op.drop_table("sessions")
    op.drop_table("course_students")
    op.drop_table("courses")
    op.drop_table("students")
    op.drop_table("users")

    for enum_name in [
        "alertseverity", "alerttype", "markedby",
        "attendancestatus", "sessionstatus", "embeddingstatus", "userrole",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
