# User Roles & Permissions

AttendAI uses four roles with a **canonical permission matrix** enforced on both the API (`backend/app/core/permissions.py`) and the frontend (`frontend/src/config/roles.js`).

## Role summary

| Role | Login destination | Purpose |
|------|-------------------|---------|
| **Student** | `/portal` | Personal read-only portal — own attendance, attention, courses |
| **Counselor** | `/dashboard` | Read-only monitoring for **assigned batch** (~40 students per intake) |
| **Teacher** | `/dashboard` | Operate classes — live sessions, students, courses, exports |
| **Administrator** | `/dashboard` | Full system control — everything a teacher can do plus system admin |

## Registration

| Who | URL | API |
|-----|-----|-----|
| Students | `/signup` | `POST /api/v1/auth/register` |
| Staff (admin, teacher, counselor) | `/staff/signup` | `POST /api/v1/auth/register/staff` (requires staff key) |

Students must be created in **Student Management** by staff with the **same email** used at signup so the account links to a student record.

---

## Counselor batch assignment

Each counselor is responsible for one **intake batch** of approximately 40 students (e.g. `2026 Intake — Group A`). An administrator uploads a CSV in **System Settings → Counselor Batches** to assign students.

### CSV format

```csv
intake_year,batch_code,counselor_email,student_id,roll_no,name,email,department
2026,A,counselor@school.edu,STU-2026-001,R001,Jane Doe,jane@school.edu,Computer Science
```

| Column | Required | Notes |
|--------|----------|-------|
| `intake_year` | Yes | Incoming cohort year |
| `batch_code` | Yes | Subgroup within intake (A, B, 03, …) |
| `counselor_email` | Yes | Must match an existing counselor user |
| `student_id` | Yes | Match existing student or create if `name` + `roll_no` present |
| `roll_no`, `name`, `email`, `department` | Optional | Used when creating new students |

### Counselor scoping

Counselors see **only students in their assigned batch(es)** on:

- **My Batch** (`/dashboard/my-batch`) — roster with attendance, attention, alerts
- Alerts, at-risk lists, correlation, reports, and dashboard stats
- Student list API (`GET /students`)

Teachers and administrators retain full access. Re-importing a student into a different batch **reassigns** them (logged in audit trail).

### API endpoints

| Endpoint | Who | Purpose |
|----------|-----|---------|
| `POST /api/v1/batches/import-csv` | Admin | Upload assignment CSV |
| `GET /api/v1/batches` | Admin | List all batches |
| `GET /api/v1/batches/mine` | Counselor | List own batches |
| `GET /api/v1/batches/{id}/students` | Counselor (own) / Admin | Batch roster with stats |

---

## Permission matrix

| Capability | Student | Counselor | Teacher | Admin |
|------------|:-------:|:---------:|:-------:|:-----:|
| Personal portal (`/portal`) | Yes | — | — | — |
| Dashboard overview | — | View (batch-scoped) | View | View |
| My Batch roster | — | Yes | — | Yes |
| Live classroom / sessions | — | — | Yes | Yes |
| Attendance manual override | — | — | Yes | Yes |
| Students — read list | — | Batch only | Yes | Yes |
| Students — create / edit / enroll face | — | — | Yes | Yes |
| Students — delete | — | — | — | Yes |
| Courses — read | — | Yes | Yes | Yes |
| Courses — create / edit / enroll | — | — | Yes | Yes |
| Courses — delete | — | — | — | Yes |
| Alerts — view & resolve | — | Batch only | Yes | Yes |
| Reports & correlation — read | — | Batch only | Yes | Yes |
| Reports — CSV/PDF export | — | — | Yes | Yes |
| Attention analytics — read | — | Batch only | Yes | Yes |
| Batch CSV import & management | — | — | — | Yes |
| System admin (users, backup, SIS, audit) | — | — | — | Yes |

---

## Role descriptions

### Student
- Access personal portal at `/portal` only
- View own attendance, attention, and enrolled courses
- Cannot access the staff dashboard

### Counselor (read-only, batch-scoped)
- View **My Batch** roster and dashboard stats for assigned students only
- Monitor alerts, at-risk students, and correlation reports for the batch
- View attention trends and attendance reports for batch students
- **Cannot** run live sessions, manage students/courses, or see other counselors' batches

### Teacher
- Run live classroom sessions and override attendance
- Manage students, face enrollment, and course enrollment
- View and export reports; resolve alerts
- Cannot access system administration

### Administrator
- Full access to all teacher capabilities
- Manage users, roles, backups, SIS import, counselor batch CSV, and audit logs
- Delete courses and student records
- Configure system settings

---

## Implementation notes

- **Backend:** routes use `require_permission(...)` dependencies from `app/api/dependencies.py`. Counselor reads use `batch_service.scope_for_user()`.
- **Frontend:** routes use `ProtectedRoute requiredPermission={...}`; sidebar uses `canAccess(role, permission)` from `config/roles.js`.
- **WebSocket** live detection requires `live_sessions` permission (teacher + admin only).

Staff registration key is configured via `STAFF_REGISTRATION_KEY` in `backend/.env` (default for local dev: `AttendAI-Staff-2026`).
