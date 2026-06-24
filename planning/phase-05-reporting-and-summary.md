# Phase 5 — Reporting, Summary & Export (AS / RSM)

> **Priority:** 🟡 High · **Est. effort:** 4–5 days
> **WBS coverage:** 8.0 (Module 4 — Attendance Summary), 11.0 partial (RSM-01, RSM-03, RSM-04)
> **User stories:** AS-01, AS-02, AS-03, AS-04, AS-05, AS-06, RSM-01, RSM-03, RSM-04
> **Depends on:** Phase 4 (persistent `Attendance`/`Session` data), Phase 1 (`Student`, `Course`), Phase 2 (auth).
> **Unblocks:** Phase 7 (alerting needs attendance % + at-risk), Phase 9 (portal attendance %).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Turn persisted attendance into analytics: backend summary/percentage/at-risk/trend/last-seen queries, real CSV/PDF export, and wiring the existing report and dashboard UIs to live data (replacing hardcoded charts and mock export toasts).

---

## 2. Entry State (baseline from `project-current-state.md`)

- `ReportsLogs.jsx` reads `smart_attendance_session_logs` from `localStorage`; analytics cards + course filter + session detail exist; **trend chart is hardcoded** (`[40,70,45,90,65,85,95]`); export buttons trigger a **mock `toast.promise`** with no file download.
- `DashboardHome.jsx` reads enrolled students/courses/session logs from `localStorage`; some stats hardcoded (e.g. 85% fallback). Does not call backend.
- No `reports` backend routes/services exist; `reportlab` listed but unused.
- After Phase 4, real `Attendance`/`Session` rows exist to query.

---

## 3. Tasks

### 3.1 Backend — Report Service (WBS 8.1.1–8.1.5)

- **5.1 `backend/app/services/report_service.py`:**
  - `get_attendance_summary(course_id, start_date, end_date)` → **AS-01**
  - `get_student_percentage(student_id)` — monthly + cumulative → **AS-02**
  - `get_at_risk_students(threshold=75)` — <75% → **AS-05, RSM-03**
  - `get_attendance_trends(course_id, period)` — daily/weekly/monthly aggregation → **AS-04**
  - `get_last_seen(session_id)` — last recognition timestamp per student → **AS-06**

### 3.2 Backend — Export Service (WBS 8.1.6, 8.1.7 — RSM-04)

- **5.2 `backend/app/services/export_service.py`:**
  - `export_csv(filters)` — `StreamingResponse`, `text/csv` (Student ID, Name, Roll No, Date, Status) → **AS-03**
  - `export_pdf(filters)` — reportlab → **AS-03**
  - `schedule_daily_export()` — automated end-of-day generation → **RSM-04** *(scheduler infra shared with Phase 8 RSM-06)*

### 3.3 Backend — Report Routes (WBS 8.1.8)

- **5.3 `backend/app/api/v1/reports.py`** (registered in `router.py`, auth-protected):
  - `GET /reports/attendance?course_id=&start_date=&end_date=` → **AS-01**
  - `GET /reports/attendance/student/{id}` → **AS-02**
  - `GET /reports/at-risk?threshold=75&department=` → **AS-05, RSM-03**
  - `GET /reports/trends?course_id=&period=weekly` → **AS-04**
  - `GET /reports/last-seen?session_id=` → **AS-06**
  - `GET /reports/export/csv?...` → **AS-03**
  - `GET /reports/export/pdf?...` → **AS-03**

### 3.4 Frontend (WBS 8.2)

- **5.4 Wire `ReportsLogs.jsx` to backend (WBS 8.2.1)** → read sessions/analytics from `/reports/*` and `GET /sessions`.
- **5.5 Date + course filter UI (WBS 8.2.2)** → date-range inputs + course dropdown (`GET /courses`), passed as query params → **AS-01**.
- **5.6 Real export downloads (WBS 8.2.3)** → "Export CSV"/"Generate PDF" hit `/reports/export/*` and trigger browser downloads; remove mock `toast.promise` → **AS-03**.
- **5.7 Live trend chart (WBS 8.2.4)** → replace hardcoded array with Recharts bound to `GET /reports/trends`, with tooltips → **AS-04**.
- **5.8 Poor-attendance report view (WBS 8.2.5)** → table of students <75% from `GET /reports/at-risk`; severity highlight (60–75% warning, <60% critical) → **AS-05, RSM-03**.
- **5.9 Last-seen column (WBS 8.2.6)** → add last-recognition time to roster/session-detail views → **AS-06**.
- **5.10 Wire `DashboardHome.jsx` (RSM-01)** → replace the 3 `localStorage` reads with `GET /students?count=true`, `GET /courses`, `GET /sessions?limit=3`; remove hardcoded stat fallbacks → **RSM-01**.

---

## 4. Contract Alignment Resolved Here

| Frontend behavior | Was | Now |
|-------------------|-----|-----|
| Reports data source | `localStorage` session logs | `/reports/*` + `/sessions` |
| Trend chart | hardcoded array | live `/reports/trends` |
| Export | mock toast | real CSV/PDF download |
| Dashboard stats | `localStorage` + hardcoded | live counts/sessions |

> Note: the `api_design.md` lists export as `GET /reports/attendance/export`; this plan uses the `docs/development_todo.md` form `GET /reports/export/csv|pdf`. Pick one and record it in `api_design.md` (recommend the explicit `/export/csv` + `/export/pdf` split).

---

## 5. Deliverables & Acceptance Criteria

- Attendance summary, per-student %, at-risk list, trends, and last-seen return correct values from real data.
- CSV and PDF downloads produce valid files reflecting the selected filters.
- `ReportsLogs.jsx` and `DashboardHome.jsx` show live data; no hardcoded charts or `localStorage` reads remain for these pages.
- At-risk (<75%) view highlights severity correctly.

---

## 6. Exit Criteria (Definition of Done)

1. All 7 report/export routes return correct, filterable data and are auth-protected.
2. Frontend reports + dashboard run fully on backend data.
3. CSV/PDF exports verified to open and match filters.
4. `smart_attendance_session_logs` reliance removed from reporting/dashboard pages.

---

## 7. Alignment Notes

- **Consumes:** Phase 4 attendance/session data; Phase 1 student/course; Phase 2 auth.
- **Soft dependency:** course filter uses `GET /courses` (full course API is Phase 8). Until Phase 8, use a minimal read of the `Course` table; the UI dropdown is finalized when Phase 8 ships the full API.
- **Unblocks Phase 7:** at-risk + attendance % feed the attendance↔attention correlation (AIM-07) and risk lists.
- **Shares with Phase 8:** the export/scheduler service is reused by the periodic email summary (RSM-06).
- **Unblocks Phase 9:** `get_student_percentage` powers the student portal's attendance stats.
