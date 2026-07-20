/**
 * Canonical RBAC matrix — mirrors backend/app/core/permissions.py
 */

export const PERMISSIONS = {
  portal_own_data: 'portal_own_data',
  dashboard_view: 'dashboard_view',
  live_sessions: 'live_sessions',
  attendance_override: 'attendance_override',
  sessions_read: 'sessions_read',
  manage_students: 'manage_students',
  students_read: 'students_read',
  manage_courses: 'manage_courses',
  courses_read: 'courses_read',
  delete_courses: 'delete_courses',
  delete_students: 'delete_students',
  alerts: 'alerts',
  reports_read: 'reports_read',
  export_reports: 'export_reports',
  attention_read: 'attention_read',
  system_admin: 'system_admin',
  batches_read: 'batches_read',
  batches_manage: 'batches_manage',
  exam_sessions: 'exam_sessions',
  exam_monitor: 'exam_monitor',
  exam_violations_read: 'exam_violations_read',
  exam_violations_review: 'exam_violations_review',
  exam_reports_export: 'exam_reports_export',
};

export const ROLE_LABELS = {
  student: 'Student',
  teacher: 'Teacher',
  counselor: 'Counselor',
  admin: 'Administrator',
};

export const ROLE_SHORT_DESCRIPTIONS = {
  student: 'Personal portal — own attendance and courses only',
  teacher: 'Run sessions, manage students and courses, export reports',
  counselor: 'Read-only monitoring — your assigned student batch (~40 per intake)',
  admin: 'Full system access including users, backups, and settings',
};

export const ROLE_DESCRIPTIONS = {
  student: [
    'Access personal portal at /portal only',
    'View own attendance, attention, and enrolled courses',
    'Cannot access the staff dashboard',
  ],
  counselor: [
    'View dashboard overview for your assigned batch',
    'Monitor alerts, at-risk students, and correlation for your batch only',
    'View attention trends and attendance reports for your students',
    'Cannot run live sessions or manage students/courses',
  ],
  teacher: [
    'Run live classroom sessions and override attendance',
    'Manage students, face enrollment, and course enrollment',
    'View and export reports; resolve alerts',
    'Cannot access system administration',
  ],
  admin: [
    'Full access to all teacher capabilities',
    'Manage users, roles, backups, SIS import, and audit logs',
    'Delete courses and student records',
    'Configure system settings',
  ],
};

const ROLE_PERMISSIONS = {
  student: [PERMISSIONS.portal_own_data],
  counselor: [
    PERMISSIONS.dashboard_view,
    PERMISSIONS.sessions_read,
    PERMISSIONS.students_read,
    PERMISSIONS.courses_read,
    PERMISSIONS.alerts,
    PERMISSIONS.reports_read,
    PERMISSIONS.attention_read,
    PERMISSIONS.batches_read,
    PERMISSIONS.exam_violations_read,
  ],
  teacher: [
    PERMISSIONS.dashboard_view,
    PERMISSIONS.live_sessions,
    PERMISSIONS.attendance_override,
    PERMISSIONS.sessions_read,
    PERMISSIONS.manage_students,
    PERMISSIONS.students_read,
    PERMISSIONS.manage_courses,
    PERMISSIONS.courses_read,
    PERMISSIONS.alerts,
    PERMISSIONS.reports_read,
    PERMISSIONS.export_reports,
    PERMISSIONS.attention_read,
    PERMISSIONS.exam_sessions,
    PERMISSIONS.exam_monitor,
    PERMISSIONS.exam_violations_read,
    PERMISSIONS.exam_violations_review,
    PERMISSIONS.exam_reports_export,
  ],
  admin: [
    PERMISSIONS.dashboard_view,
    PERMISSIONS.live_sessions,
    PERMISSIONS.attendance_override,
    PERMISSIONS.sessions_read,
    PERMISSIONS.manage_students,
    PERMISSIONS.students_read,
    PERMISSIONS.manage_courses,
    PERMISSIONS.courses_read,
    PERMISSIONS.delete_courses,
    PERMISSIONS.delete_students,
    PERMISSIONS.alerts,
    PERMISSIONS.reports_read,
    PERMISSIONS.export_reports,
    PERMISSIONS.attention_read,
    PERMISSIONS.system_admin,
    PERMISSIONS.batches_read,
    PERMISSIONS.batches_manage,
    PERMISSIONS.exam_sessions,
    PERMISSIONS.exam_monitor,
    PERMISSIONS.exam_violations_read,
    PERMISSIONS.exam_violations_review,
    PERMISSIONS.exam_reports_export,
  ],
};

/** Nav items keyed by required permission */
export const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', permission: PERMISSIONS.dashboard_view, category: 'OVERVIEW' },
  { name: 'My Batch', path: '/dashboard/my-batch', permission: PERMISSIONS.batches_read, category: 'OVERVIEW', roles: ['counselor'] },
  { name: 'Live Classroom', path: '/dashboard/live', permission: PERMISSIONS.live_sessions, category: 'OVERVIEW' },
  { name: 'Students', path: '/dashboard/students', permission: PERMISSIONS.manage_students, category: 'MANAGEMENT' },
  { name: 'Face Enrollment', path: '/dashboard/enrollment', permission: PERMISSIONS.manage_students, category: 'MANAGEMENT' },
  { name: 'Courses', path: '/dashboard/courses', permission: PERMISSIONS.manage_courses, category: 'MANAGEMENT' },
  { name: 'Attendance', path: '/dashboard/reports', permission: PERMISSIONS.reports_read, category: 'MANAGEMENT' },
  { name: 'Attention', path: '/dashboard/attention', permission: PERMISSIONS.attention_read, category: 'ANALYTICS' },
  { name: 'Exam Monitoring', path: '/dashboard/exam-monitoring', permission: PERMISSIONS.exam_monitor, category: 'ANALYTICS' },
  { name: 'Exam Review', path: '/dashboard/exam-review', permission: PERMISSIONS.exam_violations_read, category: 'ANALYTICS' },
  { name: 'Alerts', path: '/dashboard/alerts', permission: PERMISSIONS.alerts, category: 'ANALYTICS' },
  { name: 'Reports', path: '/dashboard/reports', permission: PERMISSIONS.reports_read, category: 'ANALYTICS' },
  { name: 'Administration', path: '/dashboard/settings', permission: PERMISSIONS.system_admin, category: 'SYSTEM' },
];

export function canAccess(role, permission) {
  if (!role || !permission) return false;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'User';
}
