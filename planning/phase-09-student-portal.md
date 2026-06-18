# Phase 9 — Student Personal Portal (RSM-07)

> **Priority:** 🟢 Medium · **Est. effort:** 2–3 days
> **WBS coverage:** 12.0 (Module 9 — Student Personal Portal)
> **User stories:** RSM-07
> **Depends on:** Phase 2 (student role + self-registration), Phase 4 (attendance), Phase 5 (attendance %), Phase 6 (attention), Phase 8 (courses).
> **Unblocks:** Phase 10 closure (last user-facing module).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Give students a read-only, self-service view of their own data: attendance records + percentage, attention trends, and enrolled courses — with role-based routing so students land on `/portal` (their own data) while staff use `/dashboard`. This is a thin aggregation layer over data already produced by earlier phases.

---

## 2. Entry State (baseline from `project-current-state.md`)

- **No portal exists.** `frontend/src/pages/portal/` is not present; no `/portal` route.
- Student self-registration (UAM-06) and the `student` role exist from Phase 2; `ProtectedRoute`/`Sidebar` already gate by role.
- All underlying data is now real: attendance (Phase 4), attendance % (Phase 5), attention (Phase 6), courses (Phase 8).
- The `Student.user_id` FK (Phase 1) links an authenticated student user to their student record.

---

## 3. Tasks

### 3.1 Backend (WBS 12.1)

- **9.1 Portal endpoints** → `backend/app/api/v1/portal.py` (registered in `router.py`, `require_role("student")`, scoped to the JWT user's linked student record):
  - `GET /portal/me` — own profile via JWT user → linked `Student`
  - `GET /portal/attendance` — own records + monthly/cumulative % (reuses Phase 5 `get_student_percentage`)
  - `GET /portal/attention` — own attention scores + trends (reuses Phase 6 attention service)
  - `GET /portal/courses` — own enrolled courses (reuses Phase 8 course queries)
  - All strictly filter to the caller's own data (no cross-student access).

### 3.2 Frontend (WBS 12.2)

- **9.2 Build `StudentPortal.jsx` (WBS 12.2.1)** → `frontend/src/pages/portal/StudentPortal.jsx` → **RSM-07**: personal stats (attendance %, attention %, #courses), monthly attendance calendar, attention trend line chart (Recharts), per-course stats list.
- **9.3 Student-role routing in `App.jsx` (WBS 12.2.2)** → students → `/portal` (own data only); teachers/counselors/admins → `/dashboard`. Redirect logic based on the authenticated role from Phase 2.

---

## 4. Contract Alignment Resolved Here

| Area | Was | Now |
|------|-----|-----|
| Student experience | none (single mock admin) | dedicated `/portal` with own-data scope |
| `/portal/*` endpoints | none | implemented, student-role-scoped |
| Role routing | all roles → `/dashboard` | students → `/portal`, staff → `/dashboard` |

---

## 5. Deliverables & Acceptance Criteria

- A logged-in student sees only their own attendance, attention, and courses.
- A student cannot access `/dashboard` or another student's data (enforced server-side + routing).
- Portal stats match the authoritative data from Phases 4–8.
- Attendance calendar and attention trend render from live endpoints.

---

## 6. Exit Criteria (Definition of Done)

1. All 4 `/portal/*` routes are student-role-scoped and return only the caller's data.
2. Role-based routing sends students to `/portal`, staff to `/dashboard`.
3. `StudentPortal.jsx` renders stats, calendar, and trends from live data.
4. Authorization tested: no cross-student leakage.

---

## 7. Alignment Notes

- **Consumes:** Phase 2 student role + `Student.user_id` link; Phase 4 attendance; Phase 5 percentages; Phase 6 attention; Phase 8 courses.
- **Reuses, not rebuilds:** portal endpoints wrap existing services with an own-data filter — no new analytics logic.
- **Hands to Phase 10:** student-portal authorization is part of the security/permission test suite.
