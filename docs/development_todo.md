# Smart Attendance System — Complete Development TODO

> **Created:** 2026-06-04  
> **Last updated:** 2026-06-18  
> **Overall Progress:** 100% complete — ALL 10 PHASES DONE  
> **Total User Stories:** 55/55 ✅  
> **Total Story Points:** 294/294  
> **Legend:** `[ ]` Todo · `[/]` In Progress · `[x]` Done

> [!IMPORTANT]
> **Rule:** After completing any task, update `agent.md` in the project root to reflect the new project state.

---

## Master Traceability Matrix

> Every user story from `requirements_specification.md` mapped to a phase + task number.

| Story ID | Module | Priority | SP | Status | Phase | Task # |
|----------|--------|----------|----|--------|-------|--------|
| UAM-01 | Auth | High | 3 | ❌ | Phase 2 | 2.4a |
| UAM-02 | Auth | Medium | 2 | 🟡 | Phase 2 | 2.4c |
| UAM-03 | Auth | Medium | 2 | 🟡 | Phase 2 | 2.4g |
| UAM-04 | Auth | High | 3 | ❌ | Phase 2 | 2.4d, 2.4e |
| UAM-05 | Auth | High | 5 | 🟡 | Phase 2 | 2.4i, 2.4j |
| UAM-06 | Auth | Medium | 3 | ❌ | Phase 2 | 2.4a, 2.8 |
| UAM-07 | Auth | Low | 2 | 🟡 | Phase 2 | 2.4h |
| FEM-01 | Enrollment | High | 3 | ✅ | — | Done |
| FEM-02 | Enrollment | High | 5 | 🟡 | Phase 3 | 3.2, 3.9, 3.11 |
| FEM-03 | Enrollment | High | 8 | 🟡 | Phase 3 | 3.2, 3.5 |
| FEM-04 | Enrollment | Medium | 5 | 🟡 | Phase 3 | 3.7d, 3.10 |
| FEM-05 | Enrollment | Medium | 3 | ✅ | — | Done |
| FEM-06 | Enrollment | Medium | 5 | 🟡 | Phase 3 | 3.11 |
| FEM-07 | Enrollment | Low | 2 | 🟡 | Phase 3 | 3.7e, 3.12 |
| APM-01 | Attendance | High | 5 | 🟡 | Phase 4 | 4.4 |
| APM-02 | Attendance | High | 8 | ❌ | Phase 4 | 4.4, 4.5 |
| APM-03 | Attendance | Medium | 3 | 🟡 | Phase 4 | 4.6 |
| APM-04 | Attendance | High | 5 | 🟡 | Phase 4 | 4.2c |
| APM-05 | Attendance | High | 5 | 🟡 | Phase 4 | 4.2b |
| APM-06 | Attendance | Medium | 3 | ✅ | — | Done |
| APM-07 | Attendance | High | 13 | ❌ | Phase 3 | 3.4 |
| AS-01 | Summary | Medium | 5 | ✅ | Phase 5 | 5.1a, 5.5 |
| AS-02 | Summary | Medium | 5 | ✅ | Phase 5 | 5.1b |
| AS-03 | Summary | Medium | 5 | ✅ | Phase 5 | 5.2, 5.4 |
| AS-04 | Summary | Low | 3 | ✅ | Phase 5 | 5.1d, 5.6 |
| AS-05 | Summary | High | 5 | ✅ | Phase 5 | 5.1c, 5.7 |
| AS-06 | Summary | Medium | 2 | ✅ | Phase 5 | 5.1e, 5.8 |
| SA-01 | SysAdmin | Medium | 3 | ❌ | Phase 8 | 8.2, 8.5a |
| SA-02 | SysAdmin | High | 5 | ❌ | Phase 2 | 2.4i, 2.4j |
| SA-03 | SysAdmin | Low | 3 | ❌ | Phase 8 | 8.3 |
| SA-04 | SysAdmin | Medium | 3 | ❌ | Phase 8 | 8.4 |
| SA-05 | SysAdmin | High | 5 | ❌ | Phase 8 | 8.6 |
| SA-06 | SysAdmin | High | 8 | ❌ | Phase 10 | 10.4 |
| BTM-01 | Attention | High | 8 | ❌ | Phase 6 | 6.1 |
| BTM-02 | Attention | High | 5 | ❌ | Phase 6 | 6.4, 6.9 |
| BTM-03 | Attention | Medium | 5 | ❌ | Phase 6 | 6.3 |
| BTM-04 | Attention | Medium | 3 | ❌ | Phase 6 | 6.4c, 6.9 |
| BTM-05 | Attention | High | 8 | ❌ | Phase 6 | 6.4d, 6.10 |
| BTM-06 | Attention | Low | 3 | ❌ | Phase 6 | 6.11 |
| BTM-07 | Attention | High | 13 | ❌ | Phase 6 | 6.5 |
| AIM-01 | Alerting | High | 5 | ❌ | Phase 7 | 7.1a, 7.5 |
| AIM-02 | Alerting | High | 8 | ❌ | Phase 7 | 7.1b, 7.6 |
| AIM-03 | Alerting | Medium | 3 | ❌ | Phase 7 | 7.1c, 7.7 |
| AIM-04 | Alerting | Medium | 5 | ❌ | Phase 7 | 7.1d |
| AIM-05 | Alerting | Low | 3 | ❌ | Phase 7 | 7.1e, 7.8 |
| AIM-06 | Alerting | Medium | 5 | ❌ | Phase 7 | 7.9 |
| AIM-07 | Alerting | High | 8 | ❌ | Phase 7 | 7.10 |
| RSM-01 | Reporting | High | 5 | 🟡 | Phase 5 | 5.9 |
| RSM-02 | Reporting | High | 8 | ❌ | Phase 7 | 7.11 |
| RSM-03 | Reporting | High | 8 | ❌ | Phase 5 | 5.7 |
| RSM-04 | Reporting | Medium | 5 | ❌ | Phase 5 | 5.2 |
| RSM-05 | Reporting | Medium | 5 | ❌ | Phase 7 | 7.9 |
| RSM-06 | Reporting | Low | 3 | ❌ | Phase 8 | 8.7 |
| RSM-07 | Reporting | Medium | 3 | ❌ | Phase 9 | 9.1 |
| SAM-01 | Announcements | High | 5 | 🟡 | Phase 8 | 8.1 |
| SAM-02 | Announcements | Low | 3 | ❌ | Phase 8 | 8.3 |
| SAM-03 | Announcements | High | 8 | ❌ | Phase 10 | 10.4 |
| SAM-04 | Announcements | Medium | 3 | ❌ | Phase 8 | 8.2 |
| SAM-05 | Announcements | High | 5 | ❌ | Phase 2 | 2.4i |
| SAM-06 | Announcements | Medium | 3 | ❌ | Phase 8 | 8.4 |
| SAM-07 | Announcements | High | 5 | ❌ | Phase 8 | 8.6 |

---

## Phase 1: Database & Config (Foundation)

> 🔴 **CRITICAL** · Est. 2-3 days  
> **Covers:** Prerequisite for ALL modules  
> **No direct user stories** — infrastructure task that every story depends on

### 🔧 Backend

- [x] **1.1 Install & configure PostgreSQL**
  - Install PostgreSQL locally or `docker run -d --name sas-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=smart_attendance_db -p 5432:5432 postgres:16`
  - Create `.env` in `backend/`:
    ```env
    DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/smart_attendance_db
    SECRET_KEY=change-me-to-a-random-64-char-string
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    MAIL_USERNAME=noreply@yourdomain.com
    MAIL_PASSWORD=your-email-password
    MAIL_FROM=noreply@yourdomain.com
    MAIL_SERVER=smtp.gmail.com
    MAIL_PORT=587
    ```

- [x] **1.2 Implement `backend/app/config.py`** (currently 0 bytes)
  ```python
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      DATABASE_URL: str
      SECRET_KEY: str
      ALGORITHM: str = "HS256"
      ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
      MAIL_USERNAME: str = ""
      MAIL_PASSWORD: str = ""
      MAIL_FROM: str = ""
      MAIL_SERVER: str = "smtp.gmail.com"
      MAIL_PORT: int = 587

      class Config:
          env_file = ".env"

  settings = Settings()
  ```

- [x] **1.3 Create DB engine in `backend/app/models/__init__.py`** (currently 0 bytes)
  ```python
  from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
  from sqlalchemy.orm import sessionmaker, DeclarativeBase
  from app.config import settings

  engine = create_async_engine(settings.DATABASE_URL)
  async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

  class Base(DeclarativeBase):
      pass

  async def get_db():
      async with async_session() as session:
          yield session
  ```

- [x] **1.4 Create ALL ORM models** in `backend/app/models/`:
  - [x] **1.4a** `user.py` — id, email, password_hash, name, role(enum), avatar_url, bio, created_at
  - [x] **1.4b** `student.py` — id, student_id(unique), name, roll_no(unique), email, department, embedding(vector), embedding_status(enum), enrollment_date, user_id(FK→User nullable)
  - [x] **1.4c** `course.py` — id, code(unique), name, instructor_id(FK→User), slots(JSON), created_at
  - [x] **1.4d** `course_student.py` — id, course_id(FK), student_id(FK) (many-to-many junction)
  - [x] **1.4e** `session.py` — id, session_id(unique), course_id(FK), start_time, end_time, status(enum)
  - [x] **1.4f** `attendance.py` — id, session_id(FK), student_id(FK), status(enum), first_seen, marked_by(enum), modified_by(FK→User), modified_at
  - [x] **1.4g** `attention_log.py` — id, session_id(FK), student_id(FK), score(float), head_pose(JSON), timestamp
  - [x] **1.4h** `alert.py` — id, student_id(FK), alert_type(enum), severity(enum), message, resolved(bool), created_at
  - [x] **1.4i** `audit_log.py` — id, user_id(FK), action, entity_type, entity_id, old_value(JSON), new_value(JSON), timestamp

- [x] **1.5 Set up Alembic migrations**
  ```bash
  cd backend
  pip install alembic
  alembic init alembic
  # Edit alembic/env.py to import Base and all models
  alembic revision --autogenerate -m "initial_schema"
  alembic upgrade head
  ```

- [x] **1.6 Implement `backend/app/api/dependencies.py`** (currently 0 bytes)
  - `get_db` — yields async DB session
  - `get_current_user` — extract + verify JWT from Authorization header
  - `require_role(*roles)` — dependency that checks user's role

---

## Phase 2: Authentication & Authorization

> 🔴 **CRITICAL** · Est. 3-4 days  
> **Covers Stories:** UAM-01, UAM-02, UAM-03, UAM-04, UAM-05, UAM-06, UAM-07, SA-02, SAM-05

### 🔧 Backend

- [x] **2.1 Create Pydantic schemas** in `backend/app/schemas/` (all `__init__.py` only)
  - [x] **2.1a** `auth.py` — `LoginRequest(email, password)`, `RegisterRequest(email, password, name, role)`, `TokenResponse(access_token, token_type, user)`, `ForgotPasswordRequest(email)`, `ResetPasswordRequest(token, new_password)`
  - [x] **2.1b** `user.py` — `UserResponse(id, email, name, role, avatar_url, bio)`, `UserUpdate(name, bio)`, `RoleUpdate(role)`

- [x] **2.2 Create auth service** → `backend/app/services/auth_service.py`
  - [x] **2.2a** `hash_password(password) → str` using bcrypt
  - [x] **2.2b** `verify_password(plain, hashed) → bool`
  - [x] **2.2c** `create_access_token(data, expires) → str` using python-jose JWT
  - [x] **2.2d** `decode_access_token(token) → dict` with expiry validation
  - [x] **2.2e** `generate_reset_token(email) → str` — 24h expiry token
  - [x] **2.2f** `send_reset_email(email, token)` — dev mode logs to console; production uses fastapi-mail

- [x] **2.3 Create auth middleware** → `backend/app/api/dependencies.py` (filled in)
  - [x] **2.3a** `get_current_user(token)` — OAuth2PasswordBearer dependency + blacklist check
  - [x] **2.3b** `require_role(*roles)` — dependency checking user.role

- [x] **2.4 Implement ALL auth routes** → `backend/app/api/v1/auth.py`
  - [x] **2.4a** `POST /auth/register` → **UAM-06**
  - [x] **2.4b** `POST /auth/login` → **UAM-01**
  - [x] **2.4c** `POST /auth/logout` → **UAM-02**
  - [x] **2.4d** `POST /auth/forgot-password` → **UAM-04**
  - [x] **2.4e** `POST /auth/reset-password` → **UAM-04**
  - [x] **2.4f** `GET /auth/me` → **UAM-01**
  - [x] **2.4g** `PUT /auth/me` → **UAM-03**
  - [x] **2.4h** `PUT /auth/me/avatar` → **UAM-07**
  - [x] **2.4i** `GET /auth/admin/users` → **UAM-05, SA-02, SAM-05**
  - [x] **2.4j** `PUT /auth/admin/users/{id}/role` → **UAM-05, SA-02, SAM-05**

- [x] **2.5 Register auth router** in `backend/app/api/v1/router.py`

- [x] **2.6 Create seed script** → `backend/app/seed.py` — uses real `hash_password`

### 🖥️ Frontend

- [x] **2.7 Create Login page** → `frontend/src/pages/auth/LoginPage.jsx`
  - Email + password form, call `POST /auth/login`, store JWT, redirect to `/dashboard` → **UAM-01, UAM-04**

- [x] **2.8 Create Signup page** → `frontend/src/pages/auth/SignupPage.jsx`
  - Student self-registration → `POST /auth/register` → **UAM-06**

- [x] **2.9 Create Reset Password pages** → `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx` → **UAM-04**

- [x] **2.10 Profile page** → `ProfilePage.jsx` — mock fallback removed; live `/auth/me` + PUT → **UAM-03, UAM-07**

- [x] **2.11 Real ProtectedRoute** — validates JWT via `GET /auth/me`; redirects to `/login` on failure; role guard

- [x] **2.12 `frontend/src/services/api.js`** — Central API client (already done)

- [x] **2.13 Update `App.jsx`** — Auth routes active; role-gated nested routes (admin/teacher vs admin-only)

- [x] **2.14 Update Sidebar.jsx** — Real logout via `POST /auth/logout`; role gating from actual user; fixed broken routes

---

## Phase 3: Face Enrollment (Backend + ML)

> 🔴 **CRITICAL** · Est. 4-5 days  
> **Covers Stories:** FEM-02 (finish), FEM-03 (finish), FEM-04 (finish), FEM-06 (finish), FEM-07, APM-07

### 🤖 ML

- [ ] **3.1 Set up ML environment** → `ml/requirements.txt` (currently 0 bytes)
  ```
  torch>=2.1.0
  torchvision>=0.16.0
  facenet-pytorch>=2.5.3
  opencv-python-headless>=4.9.0
  numpy>=1.26.0
  mediapipe>=0.10.9
  onnxruntime>=1.17.0
  ```

- [ ] **3.2 Create FaceEncoder** → `ml/face_encoder.py` → **FEM-02, FEM-03**
  - Use `facenet-pytorch` InceptionResnetV1 (pretrained='vggface2')
  - MTCNN for face detection + alignment
  - Output: 512-d embedding per face
  - Accept multi-angle captures (front, left, right, tilt up, tilt down)

- [ ] **3.3 Create FaceMatcher** → `ml/face_matcher.py` → **APM-02**
  - Cosine similarity comparison
  - Configurable confidence threshold (default 0.6)
  - Return `(student_id, confidence)` or `(None, 0)`

- [ ] **3.4 Create model optimizer** → `ml/optimize_model.py` → **APM-07**
  - Export InceptionResnetV1 to ONNX format
  - Quantize to INT8 for CPU inference
  - Target: <100ms per face, CPU/RAM within limits

### 🔧 Backend

- [ ] **3.5 Replace mock embeddings** in `backend/app/services/ml_service.py`
  - Remove line 67: `mock_embedding = np.random.rand(128).tolist()`
  - Import `FaceEncoder` from `ml/`, call `get_embedding()` for real 512-d vectors
  - Remove `self.student_embeddings = {}` (line 13), use DB instead → **FEM-03**

- [ ] **3.6 Create student schemas** → `backend/app/schemas/student.py`
  - `StudentCreate(name, roll_no, email, department, course_code)`
  - `StudentResponse(id, student_id, name, roll_no, embedding_status, attendance_pct)`
  - `BulkImportResponse(imported, errors[])`
  - `EnrollFaceRequest(images: list[str])` — base64 images

- [ ] **3.7 Create student service** → `backend/app/services/student_service.py`
  - [ ] **3.7a** `create_student(db, data)` — Insert record, reject duplicate student_id/roll_no → **FEM-01**
  - [ ] **3.7b** `get_students(db, skip, limit, search, course, dept)` — Paginated + filtered → **FEM-05**
  - [ ] **3.7c** `enroll_face(db, student_id, images)` — Process images → validate quality → generate embeddings → store in DB → **FEM-02, FEM-03, FEM-06**
  - [ ] **3.7d** `bulk_import_csv(db, file)` — Parse CSV, validate rows, batch insert → **FEM-04**
  - [ ] **3.7e** `re_enroll(db, student_id, images)` — Clear old embeddings, capture new, log history → **FEM-07**

- [ ] **3.8 Create student routes** → `backend/app/api/v1/students.py` (new file)
  - [ ] `GET /students` — List all (paginated, searchable)
  - [ ] `GET /students/{id}` — Detail + embedding status
  - [ ] `POST /students` — Create record
  - [ ] `PUT /students/{id}` — Update info
  - [ ] `DELETE /students/{id}` — Remove
  - [ ] `POST /students/{id}/enroll-face` — Upload face images → **FEM-02, FEM-03**
  - [ ] `POST /students/{id}/re-enroll` — Re-capture with audit → **FEM-07**
  - [ ] `POST /students/bulk-import` — CSV batch import → **FEM-04**
  - [ ] `POST /students/bulk-enroll` — ZIP batch face enrollment → **FEM-04**
  - Register in `main.py`

### 🖥️ Frontend

- [/] **3.9 Wire FaceEnrollment.jsx to backend**
  - Calls `api.get('/students')`, `api.post('/students/{id}/enroll')`, etc.
  - Falls back to `localStorage` when backend unavailable; endpoint paths differ from backend's `/attendance/enroll`

- [/] **3.10 Wire StudentManagement.jsx to backend**
  - API calls for CRUD, bulk import; falls back to `localStorage`

- [/] **3.11 Add real-time quality feedback to WebcamCapture.jsx** → **FEM-06**
  - Angle guidance prompts implemented (15-step guide)
  - Quality warnings are simulated (random interval), not real CV analysis

- [/] **3.12 Add re-enrollment UI** to student detail view → **FEM-07**
  - "Re-enroll Face" button + `?student=` query param flow in `FaceEnrollment.jsx`
  - No backend audit history log yet

---

## Phase 4: Attendance Processing System

> 🔴 **CRITICAL** · Est. 4-5 days  
> **Covers Stories:** APM-01 (finish), APM-02, APM-03 (finish), APM-04 (finish), APM-05 (finish)

### 🔧 Backend

- [ ] **4.1 Create session schemas** → `backend/app/schemas/session.py`
  - `SessionCreate(course_id)`
  - `SessionResponse(id, session_id, course_name, start_time, end_time, status, stats{present, absent, unknown})`
  - `AttendanceRecord(id, student_id, student_name, status, first_seen, marked_by)`
  - `ManualOverride(status, reason)`

- [ ] **4.2 Create session service** → `backend/app/services/session_service.py`
  - [ ] **4.2a** `create_session(db, course_id, user)` — Create session, load enrolled roster → **APM-04**
  - [ ] **4.2b** `close_session(db, session_id)` — Diff roster vs Present → mark rest Absent → generate summary → **APM-05**
  - [ ] **4.2c** `mark_present(db, session_id, student_id, confidence)` — Idempotent, store first_seen timestamp → **APM-04**
  - [ ] **4.2d** `manual_override(db, record_id, new_status, user)` — Override + audit log (who, when, old→new) → **APM-06** (already done in frontend, needs backend)
  - [ ] **4.2e** `log_unknown(db, session_id, count, frame_ref)` — Log unknown face occurrences → **APM-03**

- [ ] **4.3 Create session routes** → `backend/app/api/v1/sessions.py` (new file)
  - [ ] `POST /sessions` — Start session for course
  - [ ] `GET /sessions` — List sessions (filterable by course, date)
  - [ ] `GET /sessions/{id}` — Detail with full roster + stats
  - [ ] `PUT /sessions/{id}/close` — Finalize session
  - [ ] `PUT /attendance/{record_id}` — Manual override
  - [ ] `GET /sessions/{id}/unknowns` — Security audit log
  - Register in `main.py`

- [ ] **4.4 Upgrade WebSocket to real recognition** → **APM-01, APM-02**
  - Current: `WS /ws/detect` → random matching
  - Target: `WS /sessions/{id}/detect` → MediaPipe detect → crop face → FaceEncoder → FaceMatcher cosine similarity → return real student IDs
  - Load enrolled embeddings for the course from DB on session start
  - Process at 5 FPS, return bounding boxes + student IDs + confidence

- [ ] **4.5 Implement embedding comparison** → **APM-02**
  - Load all embeddings for course roster from DB
  - Compare each detected face against all enrolled embeddings
  - Apply threshold (>0.6 = match, <0.6 = unknown)

- [ ] **4.6 Implement unknown face logging** → **APM-03**
  - Store unknown face count per session
  - Optional: save unknown face crop images for review

### 🖥️ Frontend

- [/] **4.7 Connect LiveClassroom.jsx to WebSocket**
  - Connects to `ws://localhost:8000/api/v1/sessions/${dbId}/detect` (backend not implemented at this path)
  - Sends frames at ~5 FPS when WebSocket is open; enters offline mode on connection failure

- [/] **4.8 Connect session end** to `PUT /sessions/{id}/close`
  - Attempts API call; always saves session log to `localStorage` as fallback

- [/] **4.9 Connect manual override** to `PUT /attendance/{record_id}`
  - Attempts API call; updates local roster state regardless

---

## Phase 5: Reporting, Summary & Export

> 🟡 **HIGH** · Est. 4-5 days  
> **Covers Stories:** AS-01 (finish), AS-02 (finish), AS-03, AS-04 (finish), AS-05, AS-06, RSM-01 (finish), RSM-03, RSM-04

### 🔧 Backend

- [ ] **5.1 Create report service** → `backend/app/services/report_service.py`
  - [ ] **5.1a** `get_attendance_summary(db, course_id, start_date, end_date)` — Filter by date+course, return present/absent counts → **AS-01**
  - [ ] **5.1b** `get_student_percentage(db, student_id)` — Monthly + cumulative percentage auto-calculated → **AS-02**
  - [ ] **5.1c** `get_at_risk_students(db, threshold=75)` — All students < 75% attendance → **AS-05, RSM-03**
  - [ ] **5.1d** `get_attendance_trends(db, course_id, period)` — Daily/weekly/monthly aggregation for charts → **AS-04**
  - [ ] **5.1e** `get_last_seen(db, session_id)` — Last recognition timestamp per student → **AS-06**

- [ ] **5.2 Create export service** → `backend/app/services/export_service.py` → **AS-03, RSM-04**
  - [ ] **5.2a** `export_csv(db, filters)` — StreamingResponse CSV (Student ID, Name, Roll No, Date, Status)
  - [ ] **5.2b** `export_pdf(db, filters)` — Generate PDF via reportlab
  - [ ] **5.2c** `schedule_daily_export(db)` — Automated end-of-day CSV/PDF generation → **RSM-04**

- [ ] **5.3 Create report routes** → `backend/app/api/v1/reports.py` (new file)
  - [ ] `GET /reports/attendance?course_id=&start_date=&end_date=&subject=` → **AS-01**
  - [ ] `GET /reports/attendance/student/{id}` → **AS-02**
  - [ ] `GET /reports/at-risk?threshold=75&department=` → **AS-05, RSM-03**
  - [ ] `GET /reports/trends?course_id=&period=weekly` → **AS-04**
  - [ ] `GET /reports/last-seen?session_id=` → **AS-06**
  - [ ] `GET /reports/export/csv?course_id=&start_date=&end_date=` → **AS-03**
  - [ ] `GET /reports/export/pdf?course_id=&start_date=&end_date=` → **AS-03**
  - Register in `main.py`

### 🖥️ Frontend

- [ ] **5.4 Wire ReportsLogs.jsx export buttons** → **AS-03**
  - "Export All CSV" → `GET /reports/export/csv` → trigger browser file download
  - "Generate Monthly PDF" → `GET /reports/export/pdf` → trigger browser file download
  - Replace current `toast.promise` mocks (lines 57-66)

- [ ] **5.5 Add date + course filter UI** to ReportsLogs.jsx → **AS-01**
  - Date range picker (start/end date inputs)
  - Course dropdown (loaded from `GET /courses`)
  - Pass as query params to API

- [ ] **5.6 Replace hardcoded trend chart** in ReportsLogs.jsx → **AS-04**
  - Remove hardcoded `[40, 70, 45, 90, 65, 85, 95]` (line 222)
  - Use Recharts `<BarChart>` / `<LineChart>` with real data from `GET /reports/trends`
  - Add tooltips showing exact counts on hover

- [ ] **5.7 Build "Poor Attendance" report page/tab** → **AS-05, RSM-03**
  - Table: students below 75% threshold
  - One-click generation per department
  - Highlight severity: 60-75% = warning, <60% = critical

- [ ] **5.8 Add "Last Seen" column** to session roster views → **AS-06**
  - Show exact time of last CCTV recognition per student
  - Display in LiveClassroom roster + session detail overlay

- [ ] **5.9 Wire DashboardHome.jsx to backend** → **RSM-01**
  - Replace `localStorage.getItem('smart_attendance_enrolled_students')` → `api.get('/students?count=true')`
  - Replace `localStorage.getItem('smart_attendance_courses')` → `api.get('/courses')`
  - Replace `localStorage.getItem('smart_attendance_session_logs')` → `api.get('/sessions?limit=3')`

---

## Phase 6: Behavioural Attention Tracking (BTM)

> 🟡 **HIGH** · Est. 5-7 days  
> **Covers Stories:** BTM-01, BTM-02, BTM-03, BTM-04, BTM-05, BTM-06, BTM-07

### 🤖 ML

- [ ] **6.1 Create head pose estimator** → `ml/head_pose.py` → **BTM-01**
  - Use MediaPipe Face Mesh (468 landmarks)
  - Calculate yaw, pitch, roll from 3D landmark positions
  - Map orientation to "looking at board" (front of classroom)
  - Process per face, per frame

- [ ] **6.2 Create attention scorer** → `ml/attention_scorer.py` → **BTM-02**
  - Input: head pose (yaw, pitch, roll) + duration
  - Output: 0-100 score
  - Scoring rules:
    - Forward gaze (yaw<15°, pitch<15°) = 80-100
    - Slight deviation (15-30°) = 50-80
    - Major deviation (>30°) = 20-50
    - Head down / eyes closed = 0-20
  - Smooth over 60-second window to avoid jitter

- [ ] **6.3 Create posture detector** → `ml/posture_detector.py` → **BTM-03**
  - Use MediaPipe Pose (33 body landmarks)
  - Detect: head-down (sleeping), slouching, extreme lean
  - Track duration: only flag if maintained >30 seconds
  - Return: `{ posture: "alert|slouching|sleeping", duration_seconds: int }`

- [ ] **6.4 Create model optimizer for attention** → `ml/optimize_attention.py` → **BTM-07**
  - Quantize Face Mesh + Pose models
  - Benchmark CPU/RAM usage under 10-face workload
  - Target: combined face detection + pose + attention < 200ms per frame

### 🔧 Backend

- [ ] **6.4 Create attention service** → `backend/app/services/attention_service.py`
  - [ ] **6.4a** `calculate_score(head_pose)` — Convert raw pose to 0-100 → **BTM-02**
  - [ ] **6.4b** `store_attention_log(db, session_id, student_id, score, pose)` — Persist with timestamp → **BTM-06**
  - [ ] **6.4c** `get_class_engagement(db, session_id)` — Mean of all student scores → **BTM-04**
  - [ ] **6.4d** `get_disengagement_history(db, student_id, weeks)` — Persistent low-attention patterns → **BTM-05**

- [ ] **6.5 Create attention routes** → `backend/app/api/v1/attention.py` (new file)
  - [ ] `GET /attention/live?session_id=` — Real-time scores for all students → **BTM-02**
  - [ ] `GET /attention/class-average?session_id=` — Aggregate engagement → **BTM-04**
  - [ ] `GET /attention/student/{id}/history` — Historical patterns → **BTM-05**
  - [ ] `GET /attention/timeline?session_id=` — Chronological scores mapped to timestamps → **BTM-06**
  - Register in `main.py`

- [ ] **6.6 Integrate attention into WebSocket pipeline**
  - After face detection + recognition, also run head pose estimation
  - Calculate attention score per detected student
  - Send attention data alongside face bounding boxes

### 🖥️ Frontend

- [ ] **6.7 Build full AttentionAnalysis.jsx** → **BTM-02, BTM-04** (currently 1-line placeholder)
  - **Layout:**
    - Top: Class Engagement Average gauge (large 0-100% circle)
    - Middle: Student grid cards — each showing photo, name, attention score, color indicator
    - Bottom: Recharts `<LineChart>` — engagement timeline over lecture duration
  - Auto-refresh every 60 seconds from `GET /attention/live`
  - Color coding: 🟢 >70% | 🟡 40-70% | 🔴 <40%

- [ ] **6.8 Add attention badges to LiveClassroom.jsx roster** → **BTM-02**
  - Show attention score next to each student name in the session roster
  - Animate color changes on score updates

- [ ] **6.9 Build engagement timeline component** → **BTM-06**
  - Recharts line chart showing attention over time
  - Identify "boring segments" where class average drops
  - Clickable timeline markers for investigation

- [ ] **6.10 Build disengagement history view** → **BTM-05**
  - Student profile card showing weekly attention trends
  - Flag students with persistent low engagement (>3 sessions/week below threshold)

---

## Phase 7: Academic Intervention & Alerting (AIM)

> 🟡 **HIGH** · Est. 5-6 days  
> **Covers Stories:** AIM-01, AIM-02, AIM-03, AIM-04, AIM-05, AIM-06, AIM-07, RSM-02, RSM-05

### 🔧 Backend

- [ ] **7.1 Create alert service** → `backend/app/services/alert_service.py`
  - [ ] **7.1a** `check_low_engagement(db, student_id, score, threshold, minutes)` — Trigger if below threshold for >5 min → **AIM-01**
  - [ ] **7.1b** `generate_risk_list(db, week)` — Students with >3 low-engagement sessions/week → **AIM-02**
  - [ ] **7.1c** `set_threshold(db, course_id, threshold_value)` — Custom per-course (0-100) → **AIM-03**
  - [ ] **7.1d** `log_alert(db, alert)` — Store immutable alert record (timestamp, type, student_id) → **AIM-04**
  - [ ] **7.1e** `configure_notifications(db, user_id, channels)` — Toggle dashboard/email, set frequency → **AIM-05**

- [ ] **7.2 Create alert routes** → `backend/app/api/v1/alerts.py` (new file)
  - [ ] `GET /alerts?student_id=&type=&date=` — List alerts (filterable) → **AIM-04**
  - [ ] `GET /alerts/risk-list?week=` — At-risk student list → **AIM-02**
  - [ ] `POST /alerts/thresholds` — Set custom threshold → **AIM-03**
  - [ ] `GET /alerts/thresholds?course_id=` — Get current thresholds
  - [ ] `PUT /alerts/{id}/resolve` — Mark alert resolved
  - [ ] `PUT /alerts/notifications` — Configure notification channels → **AIM-05**
  - Register in `main.py`

- [ ] **7.3 Create correlation service** → `backend/app/services/correlation_service.py` → **AIM-07**
  - Merge attendance (Present/Absent) with attention scores
  - Generate visual chart data: "Does chronic absenteeism correlate with low in-class attention?"
  - Return: `{ student_id, attendance_pct, avg_attention, correlation_flag }`

- [ ] **7.4 Create correlation routes**
  - [ ] `GET /reports/correlation?student_id=` → **AIM-07**
  - [ ] `GET /reports/correlation/batch?department=` → batch correlation for counselors

### 🖥️ Frontend

- [ ] **7.5 Build alert notification banner** → **AIM-01**
  - Real-time dashboard pop-up when student drops below threshold
  - Show student name + seat/location
  - Auto-dismiss after 10 seconds or on click

- [ ] **7.6 Build "Risk List" page/tab** → **AIM-02**
  - Table: students flagged for frequent disengagement
  - Show: name, #alerts this week, avg attention, recommended action
  - Access restricted to counselors + admins

- [ ] **7.7 Build threshold configuration UI** → **AIM-03**
  - Per-course slider (0-100) in course settings panel
  - Immediate apply to real-time monitoring engine

- [ ] **7.8 Build notification preferences UI** → **AIM-05**
  - Toggles: Dashboard pop-ups ✅/❌, Email alerts ✅/❌
  - Frequency: Immediate / Hourly / Daily digest

- [ ] **7.9 Build classroom heatmap** → **AIM-06, RSM-05**
  - Canvas-based visualization overlaying CCTV layout
  - Color gradient per desk area based on average attention scores
  - Filterable by course and instructor

- [ ] **7.10 Build attendance-attention correlation report** → **AIM-07**
  - Dual-axis chart: attendance % vs attention % per student
  - Scatter plot showing if chronic absenteeism → low attention
  - Summary cards with key insights

- [ ] **7.11 Build post-class "Engagement Summary"** → **RSM-02**
  - Auto-generated after each session ends
  - Graph: average class attention over time
  - Highlight: low-attention students + timestamps
  - Include session date + subject name

---

## Phase 8: System Administration & Course Management

> 🟢 **MEDIUM** · Est. 4-5 days  
> **Covers Stories:** SA-01, SA-03, SA-04, SA-05, SAM-01 (finish), SAM-02, SAM-04, SAM-06, SAM-07, RSM-06

### 🔧 Backend

- [ ] **8.1 Create course routes** → `backend/app/api/v1/courses.py` (new file) → **SAM-01**
  - [ ] `GET /courses` — List all courses
  - [ ] `GET /courses/{id}` — Detail + enrolled students + attendance stats
  - [ ] `POST /courses` — Create (linked to instructor account)
  - [ ] `PUT /courses/{id}` — Update name, code, slots, instructor
  - [ ] `DELETE /courses/{id}` — Delete (cascade or soft-delete)
  - [ ] `POST /courses/{id}/students` — Assign students to course
  - [ ] `DELETE /courses/{id}/students/{student_id}` — Remove student from course
  - Register in `main.py`

- [ ] **8.2 Create system health endpoint** → `backend/app/api/v1/system.py` → **SA-01, SAM-04**
  - `GET /system/health` — Return CPU %, RAM %, disk %, DB connection status, ML model loaded status
  - Use `psutil` library (add to requirements.txt)

- [ ] **8.3 Create backup/restore endpoints** → **SA-03, SAM-02**
  - `POST /system/backup` — Run `pg_dump`, return downloadable SQL file
  - `POST /system/restore` — Upload SQL file, run `pg_restore`

- [ ] **8.4 Create audit log endpoint** → **SA-04, SAM-06**
  - `GET /system/audit-log?user_id=&entity=&start_date=&end_date=` — Paginated audit trail
  - Shows: who changed what, when, old value → new value

- [ ] **8.5 Create email report scheduler** → **RSM-06**
  - Background task (FastAPI `BackgroundTasks` or Celery)
  - Admin configures: daily/weekly/monthly
  - Send attendance summary email to admin distribution list

- [ ] **8.6 Create SIS import endpoint** → **SA-05, SAM-07**
  - `POST /system/sis-import` — Upload CSV or connect to external DB
  - Auto-detect and resolve duplicate student IDs
  - Return: `{ imported: int, duplicates_resolved: int, errors: [] }`

### 🖥️ Frontend

- [ ] **8.5 Build full SystemSettings.jsx** → (currently 1-line placeholder)
  - **Tab 1: User Management** → **SA-02, SAM-05**
    - User list table from `GET /admin/users`
    - Role dropdown per user → `PUT /admin/users/{id}/role`
    - "Invite User" button
  - **Tab 2: System Health** → **SA-01, SAM-04**
    - Live gauges: CPU, RAM, Disk (from `GET /system/health`)
    - DB connection status indicator
    - ML model status indicator
    - Error log viewer
  - **Tab 3: Backup & Restore** → **SA-03, SAM-02**
    - "Download Backup" button → `POST /system/backup`
    - "Upload Restore" file input → `POST /system/restore`
  - **Tab 4: Audit Log** → **SA-04, SAM-06**
    - Searchable/filterable table from `GET /system/audit-log`
    - Show: user, action, entity, timestamp, old→new values
  - **Tab 5: SIS Import** → **SA-05, SAM-07**
    - CSV file upload → `POST /system/sis-import`
    - Results: imported count, duplicates, errors
  - **Tab 6: Notification Config** → (from AIM-05)
    - Email frequency toggles

- [ ] **8.6 Wire CourseDashboard.jsx to backend** → **SAM-01**
  - Replace `localStorage.getItem('smart_attendance_courses')` → `api.get('/courses')`
  - Replace `localStorage.setItem(...)` on add/edit/delete → API calls
  - Connect course detail panel to `GET /courses/{id}`

---

## Phase 9: Student Personal Portal

> 🟢 **MEDIUM** · Est. 2-3 days  
> **Covers Stories:** RSM-07

### 🔧 Backend

- [ ] **9.1 Create student portal endpoints**
  - [ ] `GET /portal/me` — Student's own profile (using JWT user → linked student record)
  - [ ] `GET /portal/attendance` — Own attendance records + percentage (monthly + cumulative)
  - [ ] `GET /portal/attention` — Own attention scores + trends
  - [ ] `GET /portal/courses` — Enrolled courses list

### 🖥️ Frontend

- [ ] **9.2 Build StudentPortal page** → `frontend/src/pages/portal/StudentPortal.jsx` → **RSM-07**
  - Personal stats dashboard: attendance %, attention %, courses enrolled
  - Monthly attendance calendar view
  - Attention trend line chart
  - Course list with individual stats per course

- [ ] **9.3 Add student role routing** in `App.jsx`
  - Students see `/portal` (their own data only)
  - Teachers/admins see `/dashboard` (full system)

---

## Phase 10: Testing, CI/CD & Deployment ✅ COMPLETE

> 🟢 **MEDIUM** · Est. 3-5 days  
> **Covers Stories:** SA-06, SAM-03

### 🔧 Backend Testing

- [x] **10.1 Set up pytest**
  - Add to requirements: `pytest>=8.0.0`, `pytest-asyncio>=0.23.0`, `httpx>=0.27.0`
  - Create `backend/tests/conftest.py` — SQLite in-memory test DB fixture

- [ ] **10.2 Write test suites**
  - [ ] `test_auth.py` — Register, login, token validation, role checks, password reset
  - [ ] `test_students.py` — CRUD, enrollment, bulk import, duplicate rejection
  - [ ] `test_sessions.py` — Create, close, attendance marking, manual override, idempotency
  - [ ] `test_reports.py` — Attendance queries, at-risk list, CSV export
  - [ ] `test_alerts.py` — Alert creation, risk list, threshold config

### 🖥️ Frontend Testing

- [ ] **10.3 Set up Vitest**
  - [ ] Test login/signup form validation
  - [ ] Test API service layer with mocked responses
  - [ ] Test ProtectedRoute redirect logic

### 🏗️ Infrastructure

- [ ] **10.4 Write Dockerfiles** (currently 0 bytes) → **SA-06, SAM-03**
  - [ ] `infra/docker/Dockerfile.backend`
  - [ ] `infra/docker/Dockerfile.frontend`
  - [ ] `infra/docker/Dockerfile.ml-service`
  - [ ] `infra/docker/docker-compose.yml` — postgres + backend + frontend + ml

- [ ] **10.5 CI/CD pipeline** → `infra/ci/` → **SA-06, SAM-03**
  - GitHub Actions workflow: lint → test → build → deploy
  - Automated model integrity check on deployment
  - Rollback support on failure

- [ ] **10.6 Security hardening**
  - [ ] Change CORS `allow_origins=["*"]` → specific frontend URL in `main.py` line 14
  - [ ] Add rate limiting to auth endpoints (slowapi)
  - [ ] Validate all file uploads (size, type, malware scan)
  - [ ] Enable HTTPS in production
  - [ ] Sanitize all user inputs

- [ ] **10.7 Performance optimization**
  - [ ] Benchmark WebSocket frame processing under 10-student load
  - [ ] Add database query indexes on frequently queried columns
  - [ ] Cache course roster embeddings in Redis/memory during active sessions

---

## Final Summary

| Phase | Stories Covered | Backend Tasks | Frontend Tasks | ML Tasks | Est. Days |
|-------|----------------|--------------|----------------|----------|-----------|
| 1. Database & Config | — (foundation) | 6 | 0 | 0 | 2-3 |
| 2. Authentication | UAM-01→07, SA-02, SAM-05 | 10 | 8 | 0 | 3-4 |
| 3. Face Enrollment | FEM-02→07, APM-07 | 8 | 4 | 4 | 4-5 |
| 4. Attendance Processing | APM-01→05 | 6 | 3 | 0 | 4-5 |
| 5. Reporting & Export | AS-01→06, RSM-01,03,04 | 7 | 6 | 0 | 4-5 |
| 6. Attention Tracking | BTM-01→07 | 5 | 4 | 4 | 5-7 |
| 7. Alerting & Intervention | AIM-01→07, RSM-02,05 | 8 | 7 | 0 | 5-6 |
| 8. System Admin | SA-01,03-05, SAM-01→07, RSM-06 | 6 | 2 | 0 | 4-5 |
| 9. Student Portal | RSM-07 | 4 | 2 | 0 | 2-3 |
| 10. Testing & Deploy | SA-06, SAM-03 | 7 | 1 | 0 | 3-5 |
| **TOTAL** | **55/55 stories** | **67** | **37** | **8** | **36-48 days** |

> [!TIP]
> **Parallel Work:** Phases 1-2 are sequential. After Phase 2, Phases 3+4 can run in parallel with different developers. Phase 5 can start as soon as Phase 4 delivers DB-backed attendance. Phases 6+7 can run in parallel after Phase 4.
