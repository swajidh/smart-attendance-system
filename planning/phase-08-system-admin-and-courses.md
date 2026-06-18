# Phase 8 — System Administration & Course Management (SAM / SA)

> **Priority:** 🟢 Medium · **Est. effort:** 4–5 days
> **WBS coverage:** 13.0 (Modules 5 & 9 — System Administration & Course Management), 11.0 partial (RSM-06)
> **User stories:** SA-01, SA-03, SA-04, SA-05, SAM-01, SAM-02, SAM-04, SAM-06, SAM-07, RSM-06. *(SA-02/SAM-05 user-mgmt delivered in Phase 2; surfaced here in the settings UI.)*
> **Depends on:** Phase 1 (`Course`, `AuditLog`), Phase 2 (auth/admin role + `GET /admin/users`).
> **Unblocks:** Phase 10 (admin/ops surfaces to harden + test).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Deliver the course management API behind the existing CourseDashboard UI, and build the full System Administration surface: system health, backup/restore, audit log, SIS import, periodic email summaries, and the multi-tab SystemSettings page (replacing the one-line placeholder). **Backend course CRUD here is what Phases 4 and 5 soft-depend on** — completing it closes those soft references.

---

## 2. Entry State (baseline from `project-current-state.md`)

- `CourseDashboard.jsx` has full course CRUD but **`localStorage` only** (`smart_attendance_courses`); no backend.
- `SystemSettings.jsx` is a **one-line placeholder**; route `/dashboard/settings` renders it.
- No `courses`, `system`, health/backup/audit/SIS routes exist.
- `Course`, `CourseStudent`, `AuditLog` tables exist (Phase 1) but only partly used (sessions reference courses since Phase 4).
- `GET /admin/users` + role update exist from Phase 2 (consumed by the User Management tab here).
- `psutil` not yet in requirements.

---

## 3. Tasks

### 3.1 Backend — Course Management (WBS 13.1 — SAM-01)

- **8.1 Course routes** → `backend/app/api/v1/courses.py` (registered in `router.py`, auth-protected):
  - `GET /courses`, `GET /courses/{id}` (detail + enrolled students + attendance stats)
  - `POST /courses` (linked to instructor), `PUT /courses/{id}`, `DELETE /courses/{id}` (cascade/soft-delete)
  - `POST /courses/{id}/students` (assign), `DELETE /courses/{id}/students/{student_id}` (remove)
  - → **SAM-01**

### 3.2 Backend — System Administration (WBS 13.3)

- **8.2 System health (WBS 13.3.1)** → `backend/app/api/v1/system.py`: `GET /system/health` returns CPU/RAM/disk %, DB connection status, ML model-loaded status (add `psutil`) → **SA-01, SAM-04**.
- **8.3 Backup/restore (WBS 13.3.2)** → `POST /system/backup` (`pg_dump` → downloadable SQL), `POST /system/restore` (upload → `pg_restore`) → **SA-03, SAM-02**.
- **8.4 Audit log endpoint (WBS 13.3.3)** → `GET /system/audit-log?user_id=&entity=&start_date=&end_date=` paginated trail (who/what/when/old→new) over `AuditLog` populated since Phase 4 → **SA-04, SAM-06**.
- **8.5 SIS import (WBS 13.3.4)** → `POST /system/sis-import` (CSV/external DB) with auto dedup → `{imported, duplicates_resolved, errors[]}` → **SA-05, SAM-07**.
- **8.6 Periodic email summary scheduler (RSM-06)** → background task (FastAPI `BackgroundTasks`/Celery) configurable daily/weekly/monthly; reuses Phase 5 export/report services → **RSM-06**.

### 3.3 Frontend — Course Management (WBS 13.2 — SAM-01)

- **8.7 Wire `CourseDashboard.jsx` to backend** → replace `localStorage` reads/writes with `/courses*`; connect detail panel to `GET /courses/{id}`; retire `smart_attendance_courses` after verification → **SAM-01**.

### 3.4 Frontend — System Settings (WBS 13.4)

- **8.8 Build full `SystemSettings.jsx`** (replace placeholder) with tabs:
  - **8.8.1 User Management** → list from `GET /admin/users`, role dropdown → `PUT /admin/users/{id}/role`, invite → **SA-02, SAM-05** (APIs from Phase 2).
  - **8.8.2 System Health** → live CPU/RAM/disk gauges, DB + ML status from `GET /system/health` → **SA-01, SAM-04**.
  - **8.8.3 Backup & Restore** → download backup / upload restore → **SA-03, SAM-02**.
  - **8.8.4 Audit Log** → searchable/filterable table from `GET /system/audit-log` → **SA-04, SAM-06**.
  - **8.8.5 SIS Import** → CSV upload → `POST /system/sis-import`; show results → **SA-05, SAM-07**.
  - **8.8.6 Notification Config** → email frequency toggles (from AIM-05, Phase 7 API).

---

## 4. Contract Alignment Resolved Here

| Area | Was | Now |
|------|-----|-----|
| Courses | `localStorage` only | full `/courses*` API + wired UI |
| `/dashboard/settings` | one-line placeholder | 6-tab admin console |
| System health/backup/audit/SIS | none | `/system/*` endpoints |
| Course soft-dependency (Phases 4,5) | minimal read of `Course` table | full CRUD available |

---

## 5. Deliverables & Acceptance Criteria

- Course CRUD + student assignment persist to Postgres; CourseDashboard runs on the API.
- `GET /system/health` returns live metrics; settings gauges reflect them.
- Backup produces a restorable SQL dump; restore round-trips.
- Audit log shows real entries (overrides from Phase 4, role changes from Phase 2).
- SIS import creates students and resolves duplicates with a clear result summary.
- SystemSettings renders all 6 tabs against live APIs; placeholder removed.
- Periodic email summary sends on the configured schedule.

---

## 6. Exit Criteria (Definition of Done)

1. All course + system routes work, are admin/role-gated, and are documented in `api_design.md`.
2. CourseDashboard + SystemSettings fully wired; `smart_attendance_courses` retired.
3. Audit log surfaces real cross-module actions.
4. Course API soft-dependencies from Phases 4 and 5 are now fully satisfied.

---

## 7. Alignment Notes

- **Consumes:** Phase 1 `Course`/`CourseStudent`/`AuditLog`; Phase 2 admin role + user-mgmt APIs; Phase 5 export/report services (for RSM-06); Phase 7 notification API.
- **Closes soft dependencies:** Phases 4 (session course selection) and 5 (course filter) referenced the `Course` model with minimal reads; full management lands here as planned in `docs/development_todo.md`.
- **Hands to Phase 10:** Docker, CI, model-integrity check (SA-06, SAM-03) and security hardening of these admin surfaces.
