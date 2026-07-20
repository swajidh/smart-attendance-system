"""
Canonical RBAC permission matrix for AttendAI.

Single source of truth for role labels, descriptions, and capability checks.
"""

from __future__ import annotations

from enum import Enum

from app.models.user import User, UserRole


class Permission(str, Enum):
    # Student portal
    portal_own_data = "portal_own_data"

    # Dashboard
    dashboard_view = "dashboard_view"

    # Sessions & attendance operations
    live_sessions = "live_sessions"
    attendance_override = "attendance_override"
    sessions_read = "sessions_read"

    # Student & course management
    manage_students = "manage_students"
    students_read = "students_read"
    manage_courses = "manage_courses"
    courses_read = "courses_read"
    delete_courses = "delete_courses"
    delete_students = "delete_students"

    # Analytics & monitoring
    alerts = "alerts"
    reports_read = "reports_read"
    export_reports = "export_reports"
    attention_read = "attention_read"

    # System administration
    system_admin = "system_admin"

    # Counselor batches
    batches_read = "batches_read"
    batches_manage = "batches_manage"

    # Exam monitoring
    exam_sessions = "exam_sessions"
    exam_monitor = "exam_monitor"
    exam_violations_read = "exam_violations_read"
    exam_violations_review = "exam_violations_review"
    exam_reports_export = "exam_reports_export"


ROLE_LABELS: dict[UserRole, str] = {
    UserRole.student: "Student",
    UserRole.teacher: "Teacher",
    UserRole.counselor: "Counselor",
    UserRole.admin: "Administrator",
}

ROLE_DESCRIPTIONS: dict[UserRole, list[str]] = {
    UserRole.student: [
        "Access personal portal at /portal only",
        "View own attendance, attention, and enrolled courses",
        "Cannot access the staff dashboard",
    ],
    UserRole.counselor: [
        "View dashboard overview and analytics (read-only)",
        "Monitor your assigned student batch (~40 per intake)",
        "Monitor alerts, at-risk students, and correlation reports for your batch",
        "View attention trends and attendance reports for your batch",
        "Cannot run live sessions or manage students/courses",
    ],
    UserRole.teacher: [
        "Run live classroom sessions and override attendance",
        "Manage students, face enrollment, and course enrollment",
        "View and export reports; resolve alerts",
        "Cannot access system administration",
    ],
    UserRole.admin: [
        "Full access to all teacher capabilities",
        "Manage users, roles, backups, SIS import, and audit logs",
        "Delete courses and student records",
        "Configure system settings",
    ],
}

ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.student: {
        Permission.portal_own_data,
    },
    UserRole.counselor: {
        Permission.dashboard_view,
        Permission.sessions_read,
        Permission.students_read,
        Permission.courses_read,
        Permission.alerts,
        Permission.reports_read,
        Permission.attention_read,
        Permission.batches_read,
        Permission.exam_violations_read,
    },
    UserRole.teacher: {
        Permission.dashboard_view,
        Permission.live_sessions,
        Permission.attendance_override,
        Permission.sessions_read,
        Permission.manage_students,
        Permission.students_read,
        Permission.manage_courses,
        Permission.courses_read,
        Permission.alerts,
        Permission.reports_read,
        Permission.export_reports,
        Permission.attention_read,
        Permission.exam_sessions,
        Permission.exam_monitor,
        Permission.exam_violations_read,
        Permission.exam_violations_review,
        Permission.exam_reports_export,
    },
    UserRole.admin: {
        Permission.dashboard_view,
        Permission.live_sessions,
        Permission.attendance_override,
        Permission.sessions_read,
        Permission.manage_students,
        Permission.students_read,
        Permission.manage_courses,
        Permission.courses_read,
        Permission.delete_courses,
        Permission.delete_students,
        Permission.alerts,
        Permission.reports_read,
        Permission.export_reports,
        Permission.attention_read,
        Permission.system_admin,
        Permission.batches_read,
        Permission.batches_manage,
        Permission.exam_sessions,
        Permission.exam_monitor,
        Permission.exam_violations_read,
        Permission.exam_violations_review,
        Permission.exam_reports_export,
    },
}


def user_has_permission(user: User, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(user.role, set())


def roles_with_permission(permission: Permission) -> tuple[UserRole, ...]:
    return tuple(
        role for role, perms in ROLE_PERMISSIONS.items() if permission in perms
    )
