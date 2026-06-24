# Smart Attendance System using CCTV

This repository contains a full-stack smart attendance system that uses CCTV cameras and CNN-based facial recognition to:
- Automate attendance marking
- Estimate students' attention and focus levels
- Provide a foundation for future exam monitoring functionality

## Repository Structure

- `frontend/` – Web UI for students, teachers, and admins (**React 19 / Vite 8 / Tailwind**)
- `backend/` – REST APIs, WebSocket handlers, and business logic (**FastAPI** — 3 endpoints implemented)
- `ml/` – Planned CNN models and experiments (**directory exists, empty**; inference currently in `backend/app/services/ml_service.py`)
- `docs/` – Documentation, design notes, and reports
- `scripts/` – Development helper scripts (**README only**)
- `infra/` – Deployment configuration (**README only**)
- `tests/` – Cross-cutting tests (**README only**)

---

## Current Implementation Status

> **Last updated:** 2026-06-18 · **Overall progress:** ~20–25%

| Area | Status | Summary |
|------|--------|---------|
| **Frontend UI** | 🟡 Substantial | Landing page, dashboard shell, student management, face enrollment, live classroom, course management, reports, and profile pages are built |
| **Backend API** | 🟡 Minimal | 3 working endpoints: health check, face enrollment, WebSocket detection (`backend/app/api/v1/attendance.py`) |
| **Database** | ❌ Not started | No PostgreSQL connection; empty model/schema stubs |
| **Authentication** | ❌ Not started | `ProtectedRoute` bypasses auth with a mock user; login/signup pages not present |
| **ML / Recognition** | 🟡 Partial | MediaPipe face detection is real; embeddings and student matching are mocked |
| **Infra / Tests** | ❌ Not started | No Docker, CI, or test files |

### What works today (demo / offline mode)

The frontend uses an **API-first with `localStorage` fallback** pattern. Without a running backend, these flows still work in the browser:

- Landing page and full dashboard navigation
- Student CRUD, CSV bulk import UI, and searchable student registry
- Guided webcam face capture (15 samples with angle prompts) and bulk upload UI
- Live classroom webcam feed, canvas bounding-box overlay, manual attendance override, session finalize
- Course CRUD (stored in `localStorage`)
- Session reports and dashboard stats (from `localStorage` session logs)
- Profile page UI (name, bio, avatar — falls back to mock user)

### Backend endpoints actually implemented

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/` | Health / welcome message |
| `POST` | `/api/v1/attendance/enroll` | Face enrollment with blur/face validation; **mock** 128-d embeddings, in-memory storage |
| `WS` | `/api/v1/attendance/ws/detect` | MediaPipe detection; **random** student matching |

> **Path mismatch:** The frontend calls routes such as `/students`, `/sessions`, and `WS /sessions/{id}/detect` that are not yet implemented on the backend. See `docs/api_design.md` for the full gap analysis.

---

## 🛠️ Required Backend API Endpoints (For Backend Developers)

The frontend expects the following REST and WebSocket endpoints to be fully implemented on the backend. The Base URL is assumed to be `http://localhost:8000/api/v1`. All protected endpoints require a Bearer JWT Token in the `Authorization` header.

### 1. Authentication & Profile
- `POST /auth/login` - Authenticates user and returns `{ token, user }`.
- `POST /auth/signup` - Registers a new user.
- `POST /auth/forgot-password` - Requests password reset link.
- `GET /auth/me` - Retrieves the authenticated user's profile.
- `PUT /auth/me` - Updates the user's profile info (name, bio).
- `PUT /auth/me/avatar` - Uploads user avatar (multipart/form-data).

### 2. Student Management & Face Enrollment
- `GET /students` - Lists all enrolled students.
- `POST /students` - Creates a single new student record.
- `POST /students/bulk-import` - Uploads a CSV to bulk import student data.
- `DELETE /students/{id}` - Deletes a student record.
- `POST /students/{id}/enroll` - Uploads webcam capture frames to enroll a specific student's face data.
- `POST /students/bulk-enroll` - Uploads a ZIP file of images to bulk-enroll faces.

### 3. Courses & Past Sessions
- `GET /courses` - Retrieves a list of courses/classes available.
- `GET /sessions` - Retrieves past attendance session histories.

### 4. Live Classroom & Detection (Phase 4)
- `POST /sessions`
  - **Payload:** `{ "course_id": "CS-301" }`
  - **Response:** `{ "id": "db_session_id_here" }`
- `WS /sessions/{id}/detect`
  - **Type:** WebSocket
  - **Incoming Message (from Frontend):** `{ "type": "frame", "image": "base64_string" }`
  - **Outgoing Message (to Frontend):** 
    ```json
    {
      "faces": [
        {
          "studentId": "STU-1001",
          "status": "Present",
          "x": 10, "y": 20, "width": 20, "height": 30
        }
      ]
    }
    ```
- `PUT /attendance/{record_id}`
  - **Payload:** `{ "status": "Present", "override": true }`
- `PUT /sessions/{id}/close`
  - **Payload:** Final session statistics, timings, and attendance snapshot.

### 5. Reporting (Upcoming Phase 5)
- `GET /reports`
  - **Response:** Aggregated attendance statistics for dashboard charts.

---
*The frontend contains a built-in mock fallback for all of these endpoints so UI development can proceed independently. If the API fails to respond, the frontend automatically switches to localized mock simulations.*
