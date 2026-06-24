# Phase 4 — Attendance Processing (APM)

> **Priority:** 🔴 Critical · **Est. effort:** 4–5 days
> **WBS coverage:** 7.0 (Module 3 — Attendance Processing)
> **User stories:** APM-01, APM-02, APM-03, APM-04, APM-05. *(APM-06 manual override already done — validated here; APM-07 optimization in Phase 3.)*
> **Depends on:** Phase 3 (real embeddings + `FaceMatcher`), Phase 1 (`Session`, `Attendance`, `CourseStudent` models), Phase 2 (auth).
> **Unblocks:** Phase 5 (reporting needs DB attendance), Phase 6 (attention extends this WebSocket), Phase 9 (student portal attendance).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Deliver real, persistent attendance: create/close sessions backed by the database, upgrade the detection WebSocket to perform **real recognition** against course-roster embeddings at the canonical path, mark attendance idempotently, support manual override with audit, and log unknown faces. This makes a full "start session → recognize → finalize → records persisted" flow work for the first time.

---

## 2. Entry State (baseline from `project-current-state.md`)

- `LiveClassroom.jsx` is API-ready: loads roster via `GET /students`, starts session via `POST /sessions`, connects WebSocket to `ws://localhost:8000/api/v1/sessions/{dbId}/detect`, sends frames at ~5 FPS, manual override via `PUT /attendance/{record_id}`, close via `PUT /sessions/{id}/close`; always saves to `localStorage`. **APM-06 manual override is complete (frontend).**
- Backend has only `WS /api/v1/attendance/ws/detect` with **random** recognition (fake `studentId`, random Present/Unknown). The frontend's `/sessions/{id}/detect` path **does not exist** on the backend.
- No session/attendance REST routes exist; no session/attendance persistence.
- Phase 3 now provides real embeddings in DB + a working `FaceMatcher`.

---

## 3. Tasks

### 3.1 Backend — Sessions & Attendance (WBS 7.1)

- **4.1 Session schemas (WBS 7.1.1)** → `backend/app/schemas/session.py`: `SessionCreate(course_id)`, `SessionResponse(id, session_id, course_name, start_time, end_time, status, stats{present, absent, unknown})`, `AttendanceRecord(...)`, `ManualOverride(status, reason)`.
- **4.2 Session service (WBS 7.1.2)** → `backend/app/services/session_service.py`:
  - `create_session(course_id, user)` — create session + load enrolled roster from `CourseStudent` → **APM-04**
  - `mark_present(session_id, student_id, confidence)` — idempotent; store `first_seen` once → **APM-04**
  - `close_session(session_id)` — diff roster vs Present → mark remainder Absent → summary → **APM-05**
  - `manual_override(record_id, new_status, user)` — write `AuditLog` (who/when/old→new) → **APM-06 (backend)**
  - `log_unknown(session_id, count, frame_ref)` → **APM-03**
- **4.3 Session routes (WBS 7.1.3)** → `backend/app/api/v1/sessions.py`, registered in `router.py`, auth-protected:
  - `POST /sessions`, `GET /sessions` (filter course/date), `GET /sessions/{id}` (roster + stats)
  - `PUT /sessions/{id}/close` (APM-05)
  - `PUT /attendance/{record_id}` (manual override, APM-06)
  - `GET /sessions/{id}/unknowns` (APM-03)

### 3.2 Backend — Real-Time Recognition (WBS 7.1.4–7.1.6)

- **4.4 Upgrade WebSocket (WBS 7.1.4)** → implement `WS /api/v1/sessions/{session_id}/detect` (canonical path): receive frame → MediaPipe detect → crop → `FaceEncoder` embed → `FaceMatcher` cosine match against roster → return bounding boxes + matched `student_id` + confidence + status. Process ~5 FPS → **APM-01, APM-02**.
- **4.5 Load roster embeddings on session start (WBS 7.1.5)** → on session create, load enrolled-student embeddings for the course into memory for the session's lifetime (cache; Redis option deferred to Phase 10).
- **4.6 Embedding comparison + threshold (WBS 7.1.6)** → match >0.6 = recognized + `mark_present`; <0.6 = unknown + `log_unknown` → **APM-02, APM-03**.
- **4.7 Retire/alias legacy `WS /attendance/ws/detect`** once the frontend uses the new path.

### 3.3 Frontend (WBS 7.2)

- **4.8 Align `LiveClassroom.jsx` WebSocket (WBS 7.2.1)** → confirm it connects to the now-real `/sessions/{id}/detect`; render real boxes + student IDs + confidence.
- **4.9 Validate live present/absent roster sync (WBS 7.2.2)** → roster updates from real recognition events → **APM-04**.
- **4.10 Validate manual override against backend (WBS 7.2.3)** → `PUT /attendance/{record_id}` persists; remove local-only toggle reliance → **APM-06**.
- **4.11 Validate session finalize (WBS 7.2.4)** → `PUT /sessions/{id}/close` persists summary; stop relying on `localStorage` session logs → **APM-05**.
- **4.12 Unknown-face alerting UI (WBS 7.2.5)** → surface unknown detections from `GET /sessions/{id}/unknowns` → **APM-03**.
- **4.13 Retire `smart_attendance_session_logs` localStorage** after close/reporting verified (note: Phase 5 `ReportsLogs.jsx` depends on this data moving to the backend).

---

## 4. Contract Alignment Resolved Here

| Frontend expects | Was | Now |
|------------------|-----|-----|
| `WS /sessions/{id}/detect` | `WS /attendance/ws/detect` (random) | real recognition at canonical path |
| `POST /sessions`, `GET /sessions`, `GET /sessions/{id}` | none | implemented |
| `PUT /sessions/{id}/close` | none | implemented (APM-05) |
| `PUT /attendance/{record_id}` | none | implemented + audit (APM-06) |
| `GET /sessions/{id}/unknowns` | none | implemented (APM-03) |
| frame message `{type:"frame", image}` | backend read raw text | backend parses the documented JSON frame shape |

---

## 5. Deliverables & Acceptance Criteria

- Starting a session loads the real course roster and persists a `Session` row.
- A recognized enrolled face is marked Present **once** (idempotent) with a `first_seen` timestamp.
- An unrecognized face is logged as unknown and visible via `/sessions/{id}/unknowns`.
- Closing a session marks unseen roster members Absent and stores a summary.
- Manual override persists and writes an `AuditLog` entry.
- The full flow (create → recognize live → override → close) persists to Postgres with no `localStorage` dependency.

---

## 6. Exit Criteria (Definition of Done)

1. Real recognition replaces random matching; correct students are marked from live video against enrolled embeddings.
2. All 6 session/attendance routes work and are auth-protected.
3. `LiveClassroom.jsx` runs fully against the backend; `localStorage` session logs retired.
4. Attendance data is queryable by course/date (the substrate Phase 5 reports on).

---

## 7. Alignment Notes

- **Consumes:** Phase 3 embeddings + `FaceMatcher`; Phase 1 `Session`/`Attendance`/`CourseStudent`; Phase 2 auth.
- **Course dependency:** sessions reference a `course_id`. The `Course` model exists (Phase 1); full course CRUD UI/API is Phase 8. For now, sessions select from existing course rows (seeded or via minimal read). This soft dependency is mirrored in Phase 8.
- **Unblocks Phase 5:** persistent `Attendance` rows enable summaries, at-risk, trends, exports.
- **Unblocks Phase 6:** the detection WebSocket built here is **extended** (not replaced) to also run head-pose/attention scoring per recognized student.
- **Unblocks Phase 9:** student portal reads the student's own attendance from these records.
