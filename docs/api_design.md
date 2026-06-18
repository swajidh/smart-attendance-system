# Backend API Endpoint Reference

> **For:** Backend Developers  
> **Last Updated:** 2026-06-18  
> **Base URL:** `http://localhost:8000`  
> **Framework:** FastAPI (Python 3.12)

---

## ⚡ Quick Status

| Category | Implemented | Needed | Gap |
|----------|------------|--------|-----|
| **Existing Endpoints** | 3 | — | — |
| **Endpoints to Build** | — | 30+ | All modules need backend |

---

## ✅ IMPLEMENTED ENDPOINTS (Currently Working)

These 3 endpoints exist in `backend/app/api/v1/attendance.py` and `backend/app/main.py`:

### 1. Health Check

```
GET /
```

| Field | Value |
|-------|-------|
| **File** | `backend/app/main.py` (line 23) |
| **Auth** | None |
| **Response** | `{ "message": "Welcome to Smart Attendance API" }` |
| **Status** | ✅ Working |

---

### 2. Enroll Student (Face Enrollment)

```
POST /api/v1/attendance/enroll
```

| Field | Value |
|-------|-------|
| **File** | `backend/app/api/v1/attendance.py` (line 7) |
| **Module** | FEM (Face Enrollment) |
| **Auth** | None (needs UAM) |
| **Request Body** | `{ "studentId": "STU-1001", "images": ["base64...", "base64..."] }` |
| **Processing** | Decodes base64 images → blur check (Laplacian) → face validation (MediaPipe) → resize 160×160 → normalize → generates **mock** 128-d embedding |
| **Min Images** | 10 valid face images required |
| **Success Response** | `{ "status": "success", "message": "Successfully enrolled STU-1001 with 10 samples", "student_id": "STU-1001" }` |
| **Error Response** | `{ "status": "error", "message": "Only 3 high-quality images captured. Min 10 required.", "errors": [...] }` |
| **Status** | ✅ Working (mock embeddings — `np.random.rand(128)` not real model) |

**⚠️ Known Limitations:**
- Embeddings are random vectors, NOT from a real model (FaceNet/ArcFace)
- Embeddings stored in-memory dict, lost on server restart
- No database persistence
- No auth/role check

---

### 3. Real-Time Face Detection (WebSocket)

```
WebSocket /api/v1/attendance/ws/detect
```

| Field | Value |
|-------|-------|
| **File** | `backend/app/api/v1/attendance.py` (line 21) |
| **Module** | APM (Attendance Processing) |
| **Auth** | None (needs UAM) |
| **Input** | Client sends base64-encoded JPEG frame as text message |
| **Processing** | Decodes image → MediaPipe face detection → returns bounding box coordinates as percentages |
| **Response** | `{ "status": "success", "faces": [{ "x": 23.5, "y": 15.2, "width": 20.1, "height": 30.4, "confidence": 0.92, "status": "Present"/"Unknown", "studentId": "STU-1234"/null }] }` |
| **Status** | ✅ Working (detection is real via MediaPipe, but recognition/matching is **random**) |

**⚠️ Known Limitations:**
- `status` field is randomly assigned (`Present` 70% / `Unknown` 30%)
- `studentId` is randomly generated, NOT matched against stored embeddings
- Frontend `LiveClassroom.jsx` connects to `WS /api/v1/sessions/{id}/detect` (not yet implemented); this endpoint path differs from what the frontend expects
- When the WebSocket connection fails, the frontend enters offline mode (camera only, no detection overlay)

---

## 🔧 ENDPOINTS TO BUILD — Per Module

> Organized by module so each backend developer can pick up a module and build its full API.

---

### Module 1: Authentication & User Management (UAM)

**Priority:** 🔴 CRITICAL — blocks all other modules  
**Dependencies:** Database, JWT library  
**Additional packages needed:** `python-jose[cryptography]`, `passlib[bcrypt]`, `python-multipart`

| Method | Endpoint | Description | User Story | Priority |
|--------|----------|-------------|-----------|----------|
| `POST` | `/api/v1/auth/register` | Register new user (admin creates teachers; students self-register) | UAM-06 | High |
| `POST` | `/api/v1/auth/login` | Login with email + password, returns JWT access + refresh tokens | UAM-01 | High |
| `POST` | `/api/v1/auth/logout` | Invalidate token / blacklist | UAM-02 | Medium |
| `POST` | `/api/v1/auth/forgot-password` | Send password reset email link | UAM-04 | High |
| `POST` | `/api/v1/auth/reset-password` | Reset password via token from email | UAM-04 | High |
| `GET` | `/api/v1/auth/me` | Get current user profile | UAM-01 | High |
| `PUT` | `/api/v1/auth/me` | Update own profile (name, bio) | UAM-03 | Medium |
| `PUT` | `/api/v1/auth/me/avatar` | Upload profile picture (multipart) | UAM-07 | Low |
| `GET` | `/api/v1/admin/users` | List all users (admin only) | UAM-05 | High |
| `PUT` | `/api/v1/admin/users/{user_id}/role` | Assign/change user role | UAM-05 | High |

**Notes for developer:**
- Use `python-jose` for JWT encoding/decoding
- Store hashed passwords with `passlib` bcrypt
- Create middleware in `backend/app/middleware/` for token validation
- Roles: `admin`, `teacher`, `counselor`, `student`
- Protect all subsequent endpoints with `Depends(get_current_user)`

---

### Module 2: Student Registration — Face Enrollment (FEM)

**Priority:** 🔴 CRITICAL  
**Dependencies:** UAM (auth), Database, ML model  
**Existing code:** `POST /enroll` exists but needs DB + real model

| Method | Endpoint | Description | User Story | Priority |
|--------|----------|-------------|-----------|----------|
| `GET` | `/api/v1/students` | List all students (paginated, filterable by course/department) | FEM-05 | High |
| `GET` | `/api/v1/students/{student_id}` | Get single student detail + embedding status | FEM-05 | High |
| `POST` | `/api/v1/students` | Create student record (basic info without face) | FEM-01 | High |
| `PUT` | `/api/v1/students/{student_id}` | Update student info | FEM-01 | Medium |
| `DELETE` | `/api/v1/students/{student_id}` | Remove student from system | FEM-01 | Medium |
| `POST` | `/api/v1/students/{student_id}/enroll-face` | Upload face images → generate & store embeddings | FEM-02, FEM-03 | High |
| `POST` | `/api/v1/students/{student_id}/re-enroll` | Clear old embeddings + re-capture (with audit log) | FEM-07 | Low |
| `POST` | `/api/v1/students/bulk-import` | Upload CSV file to batch-create student records | FEM-04 | Medium |
| `POST` | `/api/v1/students/bulk-enroll` | Upload ZIP of student images for batch face enrollment | FEM-04 | Medium |

**Notes for developer:**
- Refactor existing `POST /attendance/enroll` to use real model instead of `np.random.rand(128)`
- Frontend currently calls `POST /students/{id}/enroll` — align route paths when implementing student routes
- Store embeddings as vector column or BLOB in DB
- Validate image quality before processing (blur check already in `ml_service.py`)
- Keep `ml_service.py` as the service layer, add DB calls

---

### Module 3: Attendance Processing (APM)

**Priority:** 🔴 CRITICAL  
**Dependencies:** FEM (embeddings), UAM (auth), Database  
**Existing code:** WebSocket endpoint exists but recognition is random

| Method | Endpoint | Description | User Story | Priority |
|--------|----------|-------------|-----------|----------|
| `POST` | `/api/v1/sessions` | Create new attendance session for a course | APM-04 | High |
| `GET` | `/api/v1/sessions` | List all sessions (filterable by course, date) | APM-04 | High |
| `GET` | `/api/v1/sessions/{session_id}` | Get session detail with full roster + status | APM-04 | High |
| `PUT` | `/api/v1/sessions/{session_id}/close` | Close session → mark remaining as Absent → generate summary | APM-05 | High |
| `WS` | `/api/v1/sessions/{session_id}/detect` | Real-time frame processing for a specific session (upgrade existing `/ws/detect`) | APM-01, APM-02 | High |
| `PUT` | `/api/v1/attendance/{record_id}` | Manual override: change Present↔Absent (with audit log) | APM-06 | Medium |
| `GET` | `/api/v1/sessions/{session_id}/unknowns` | Get list of unknown face detections for security audit | APM-03 | Medium |

**Notes for developer:**
- The WebSocket should: receive frame → detect faces (MediaPipe) → crop faces → extract embeddings (real model) → compare with DB embeddings (cosine similarity, threshold 0.6) → return matched student IDs
- Prevent duplicate "Present" marks for same student in same session
- Store `first_seen` timestamp on first recognition
- Log who made manual overrides + original/new values in audit table

---

### Module 4: Attendance Summary (AS)

**Priority:** 🟡 HIGH  
**Dependencies:** APM (session data), Database

| Method | Endpoint | Description | User Story | Priority |
|--------|----------|-------------|-----------|----------|
| `GET` | `/api/v1/reports/attendance` | Get attendance summary (filterable by date range, course, student) | AS-01 | Medium |
| `GET` | `/api/v1/reports/attendance/student/{student_id}` | Get individual student attendance percentage (monthly + cumulative) | AS-02 | Medium |
| `GET` | `/api/v1/reports/attendance/export` | Export attendance data as CSV file download | AS-03 | Medium |
| `GET` | `/api/v1/reports/attendance/trends` | Get attendance trend data for chart visualization | AS-04 | Low |
| `GET` | `/api/v1/reports/at-risk` | Generate list of students below 75% attendance threshold | AS-05 | High |
| `GET` | `/api/v1/reports/last-seen` | Get "Last Seen" timestamps for students in a session | AS-06 | Medium |

**Notes for developer:**
- All reports should support query params: `?course_id=`, `?start_date=`, `?end_date=`, `?department=`
- CSV export: use `StreamingResponse` with `text/csv` content type
- At-risk endpoint is HIGH priority — directly maps to mandatory 75% threshold rule

---

### Module 9: Course/Subject Management (SAM — partial)

**Priority:** 🟡 HIGH  
**Dependencies:** UAM (auth), Database  
**Note:** Frontend CRUD exists in `CourseDashboard.jsx` (`localStorage` only) — backend needs to mirror it

| Method | Endpoint | Description | User Story | Priority |
|--------|----------|-------------|-----------|----------|
| `GET` | `/api/v1/courses` | List all courses | SAM-01 | High |
| `GET` | `/api/v1/courses/{course_id}` | Get course detail with enrolled students | SAM-01 | High |
| `POST` | `/api/v1/courses` | Create new course (linked to instructor) | SAM-01 | High |
| `PUT` | `/api/v1/courses/{course_id}` | Update course details | SAM-01 | High |
| `DELETE` | `/api/v1/courses/{course_id}` | Delete course | SAM-01 | Medium |
| `POST` | `/api/v1/courses/{course_id}/students` | Assign students to course | SAM-01 | High |

---

## 📦 `requirements.txt` Status

`backend/requirements.txt` lists all planned dependencies (database, auth, ML, export, email). **Only the core framework and CV packages are actively used** by the three implemented endpoints:

| Category | Listed in requirements.txt | Wired up in code |
|----------|---------------------------|------------------|
| FastAPI, uvicorn, pydantic, websockets | ✅ | ✅ |
| opencv-python-headless, mediapipe, numpy | ✅ | ✅ (`ml_service.py`) |
| sqlalchemy, asyncpg, alembic | ✅ | ❌ Not used yet |
| python-jose, passlib, python-multipart | ✅ | ❌ Not used yet |
| torch, torchvision, facenet-pytorch | ✅ | ❌ Not used yet (mock embeddings) |
| reportlab, openpyxl, fastapi-mail | ✅ | ❌ Not used yet |
| python-dotenv, aiofiles | ✅ | ❌ Not used yet |
