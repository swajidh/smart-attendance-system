# Work Breakdown Structure — Smart Attendance System

## 1.0 Project Management & Governance
- 1.1 Project Initiation
  - 1.1.1 Define project charter, vision, and success criteria
  - 1.1.2 Identify stakeholders (admins, teachers, counselors, students, IT support)
  - 1.1.3 Define scope boundaries (attendance, attention tracking, future exam monitoring)
  - 1.1.4 Establish FYP milestones, deadlines, and evaluation checkpoints
- 1.2 Planning & Tracking
  - 1.2.1 Maintain phased roadmap (`docs/development_todo.md`)
  - 1.2.2 Maintain user-story traceability matrix (55 stories → phases/tasks)
  - 1.2.3 Maintain agent/state log (`agent.md`) after each completed task
  - 1.2.4 Risk register (model accuracy, hardware limits, privacy/legal, schedule)
  - 1.2.5 Effort estimation and story-point tracking
- 1.3 Standards & Conventions
  - 1.3.1 Define git branching, commit, and PR review policy
  - 1.3.2 Define coding standards (frontend JSX, backend Python, ML)
  - 1.3.3 Reconcile architecture spec conflict (`non-negociable-cursor-reqs.md` Next.js/TS vs. actual React/Vite)
  - 1.3.4 Define API contract ownership and versioning policy
- 1.4 Privacy, Ethics & Compliance
  - 1.4.1 Biometric data handling and consent policy
  - 1.4.2 Data retention and deletion policy (faces, embeddings, footage)
  - 1.4.3 Attention-tracking ethical use guidelines
  - 1.4.4 Regulatory/institutional approval documentation

## 2.0 Requirements & Architecture
- 2.1 Requirements Engineering
  - 2.1.1 Finalize functional requirements (9 modules, 55 user stories)
  - 2.1.2 Finalize non-functional requirements (performance, scalability, security)
  - 2.1.3 Define acceptance criteria per user story
  - 2.1.4 Define CCTV/hardware and environment constraints
- 2.2 System Architecture Design
  - 2.2.1 Author `system_architecture.md` (component & data-flow diagrams)
  - 2.2.2 Define frontend ↔ backend ↔ ML interaction model
  - 2.2.3 Define real-time pipeline architecture (WebSocket, FPS, latency budget)
  - 2.2.4 Define deployment topology (services, DB, model server)
- 2.3 Data & API Design
  - 2.3.1 Design ER model and database schema (`backend/docs/schema.md`)
  - 2.3.2 Finalize REST/WebSocket API contracts (`docs/api_design.md`)
  - 2.3.3 Resolve frontend/backend route path mismatches (enroll, detect)
  - 2.3.4 Define standard response envelope and error model
- 2.4 ML Design
  - 2.4.1 Author `ml_design.md` (model selection, training, evaluation)
  - 2.4.2 Define embedding strategy (dimensionality, model family)
  - 2.4.3 Define attention/head-pose modeling approach
- 2.5 UX Design
  - 2.5.1 Author `ui_ux_design.md` (wireframes, user flows)
  - 2.5.2 Define role-based navigation and access map

## 3.0 Foundation & Infrastructure Setup
- 3.1 Development Environment
  - 3.1.1 Implement `scripts/setup_dev_env.*`
  - 3.1.2 Implement `scripts/start_dev.*` (frontend + backend + ML)
  - 3.1.3 Define environment variable strategy (`.env`, `VITE_*`)
- 3.2 Backend Application Skeleton
  - 3.2.1 Implement `backend/app/config.py` (pydantic-settings)
  - 3.2.2 Implement `backend/app/api/v1/router.py` aggregation
  - 3.2.3 Implement `backend/app/api/dependencies.py` (DB, auth, pagination)
  - 3.2.4 Implement middleware (request ID, logging, error handling)
  - 3.2.5 Harden CORS (replace `allow_origins=["*"]`)
- 3.3 Database Layer
  - 3.3.1 Provision PostgreSQL (local + containerized)
  - 3.3.2 Implement async engine/session factory (`models/__init__.py`)
  - 3.3.3 Implement ORM models
    - 3.3.3.1 User
    - 3.3.3.2 Student
    - 3.3.3.3 Course
    - 3.3.3.4 Course-Student junction
    - 3.3.3.5 Session
    - 3.3.3.6 Attendance record
    - 3.3.3.7 Attention log
    - 3.3.3.8 Alert
    - 3.3.3.9 Audit log
  - 3.3.4 Configure Alembic and generate initial migration
  - 3.3.5 Implement seed script (default admin, sample data)
- 3.4 Frontend Foundation
  - 3.4.1 Maintain shared UI component library (`components/ui/`)
  - 3.4.2 Maintain API client and interceptors (`services/api.js`)
  - 3.4.3 Maintain dashboard layout, sidebar, topbar
  - 3.4.4 Remove duplicate landing files (`pages/landing` vs `components/landing`)
  - 3.4.5 Fix broken sidebar routes (`/dashboard/attendance`, `/dashboard/alerts`)

## 4.0 Module 1 — Authentication & User Management (UAM)
- 4.1 Backend
  - 4.1.1 Auth schemas (login, register, token, reset)
  - 4.1.2 Auth service (bcrypt hashing, JWT create/decode)
  - 4.1.3 Password reset token + email service (`fastapi-mail`)
  - 4.1.4 Auth middleware (`get_current_user`, `require_role`)
  - 4.1.5 Auth routes
    - 4.1.5.1 `POST /auth/register` (UAM-06)
    - 4.1.5.2 `POST /auth/login` (UAM-01)
    - 4.1.5.3 `POST /auth/logout` (UAM-02)
    - 4.1.5.4 `POST /auth/forgot-password` (UAM-04)
    - 4.1.5.5 `POST /auth/reset-password` (UAM-04)
    - 4.1.5.6 `GET /auth/me` (UAM-01)
    - 4.1.5.7 `PUT /auth/me` — name/bio (UAM-03)
    - 4.1.5.8 `PUT /auth/me/avatar` (UAM-07)
    - 4.1.5.9 `GET /admin/users` (UAM-05)
    - 4.1.5.10 `PUT /admin/users/{id}/role` (UAM-05)
  - 4.1.6 RBAC enforcement across all protected routes
- 4.2 Frontend
  - 4.2.1 Login page
  - 4.2.2 Signup page (student self-registration, UAM-06)
  - 4.2.3 Forgot/reset password pages (UAM-04)
  - 4.2.4 Replace mock `ProtectedRoute` with real JWT guard
  - 4.2.5 Restore auth routes in `App.jsx`
  - 4.2.6 Wire `ProfilePage.jsx` to live `/auth/me` (UAM-03, UAM-07)
  - 4.2.7 Role-based sidebar/navigation gating (UAM-05)
  - 4.2.8 Logout flow and token invalidation (UAM-02)

## 5.0 Module 2 — Student Registration & Face Enrollment (FEM)
- 5.1 Backend
  - 5.1.1 Student schemas (create, response, bulk import, enroll)
  - 5.1.2 Student service (CRUD, duplicate rejection)
  - 5.1.3 Face enrollment service (validate → embed → persist)
  - 5.1.4 Bulk CSV import service (FEM-04)
  - 5.1.5 Bulk ZIP face-enroll service (FEM-04)
  - 5.1.6 Re-enroll service with audit history (FEM-07)
  - 5.1.7 Student routes
    - 5.1.7.1 `GET /students` (FEM-05)
    - 5.1.7.2 `GET /students/{id}`
    - 5.1.7.3 `POST /students` (FEM-01)
    - 5.1.7.4 `PUT /students/{id}`
    - 5.1.7.5 `DELETE /students/{id}`
    - 5.1.7.6 `POST /students/{id}/enroll-face` (FEM-02, FEM-03)
    - 5.1.7.7 `POST /students/{id}/re-enroll` (FEM-07)
    - 5.1.7.8 `POST /students/bulk-import` (FEM-04)
    - 5.1.7.9 `POST /students/bulk-enroll` (FEM-04)
  - 5.1.8 Replace mock embeddings in `ml_service.py` with real model
  - 5.1.9 Persist embeddings to DB (remove in-memory dict)
- 5.2 Frontend
  - 5.2.1 Align `FaceEnrollment.jsx` calls to final student routes
  - 5.2.2 Align `StudentManagement.jsx` CRUD + bulk import to backend
  - 5.2.3 Replace simulated quality warnings with real CV feedback (FEM-06)
  - 5.2.4 Validate guided multi-angle capture against backend (FEM-02)
  - 5.2.5 Re-enrollment UI + history display (FEM-07)
  - 5.2.6 Remove `localStorage` fallback once backend is stable

## 6.0 ML / Face Recognition Pipeline
- 6.1 ML Environment
  - 6.1.1 Create `ml/requirements.txt`
  - 6.1.2 Establish `ml/` package structure
- 6.2 Recognition Models
  - 6.2.1 Implement `ml/face_encoder.py` (detection + alignment + embedding)
  - 6.2.2 Implement `ml/face_matcher.py` (cosine similarity, threshold) (APM-02)
  - 6.2.3 Implement quality validator (blur/lighting/pose)
- 6.3 Optimization (APM-07)
  - 6.3.1 Export model to ONNX
  - 6.3.2 Quantize to INT8 for CPU inference
  - 6.3.3 Benchmark latency/memory under multi-face load
- 6.4 Model Lifecycle
  - 6.4.1 Embedding versioning and storage format
  - 6.4.2 Accuracy evaluation harness and metrics
  - 6.4.3 Model integrity check on deploy

## 7.0 Module 3 — Attendance Processing (APM)
- 7.1 Backend
  - 7.1.1 Session schemas
  - 7.1.2 Session service
    - 7.1.2.1 Create session + load roster (APM-04)
    - 7.1.2.2 Mark present (idempotent, first-seen) (APM-04)
    - 7.1.2.3 Close session → mark absent + summary (APM-05)
    - 7.1.2.4 Manual override + audit (APM-06)
    - 7.1.2.5 Unknown-face logging (APM-03)
  - 7.1.3 Session routes
    - 7.1.3.1 `POST /sessions`
    - 7.1.3.2 `GET /sessions`
    - 7.1.3.3 `GET /sessions/{id}`
    - 7.1.3.4 `PUT /sessions/{id}/close`
    - 7.1.3.5 `PUT /attendance/{record_id}`
    - 7.1.3.6 `GET /sessions/{id}/unknowns`
  - 7.1.4 Upgrade WebSocket to `WS /sessions/{id}/detect` with real recognition (APM-01, APM-02)
  - 7.1.5 Load course roster embeddings on session start
  - 7.1.6 Embedding comparison + threshold logic (APM-02)
- 7.2 Frontend
  - 7.2.1 Align `LiveClassroom.jsx` WebSocket path to backend
  - 7.2.2 Validate live present/absent roster sync (APM-04)
  - 7.2.3 Validate manual override against backend (APM-06)
  - 7.2.4 Validate session finalize against backend (APM-05)
  - 7.2.5 Unknown-face alerting UI (APM-03)

## 8.0 Module 4 — Attendance Summary (AS)
- 8.1 Backend
  - 8.1.1 Attendance summary query (date/course filter) (AS-01)
  - 8.1.2 Student percentage calc (monthly + cumulative) (AS-02)
  - 8.1.3 At-risk report (<75% threshold) (AS-05)
  - 8.1.4 Attendance trend aggregation (AS-04)
  - 8.1.5 Last-seen timestamp query (AS-06)
  - 8.1.6 CSV export service (AS-03)
  - 8.1.7 PDF export service (AS-03)
  - 8.1.8 Report routes (`/reports/*`, `/reports/export/*`)
- 8.2 Frontend
  - 8.2.1 Wire `ReportsLogs.jsx` to backend reports
  - 8.2.2 Date + course filter UI (AS-01)
  - 8.2.3 Real export download buttons (AS-03)
  - 8.2.4 Replace hardcoded trend chart with live data (AS-04)
  - 8.2.5 Poor-attendance report view (AS-05)
  - 8.2.6 Last-seen column in roster views (AS-06)

## 9.0 Module 6 — Behavioural Attention Tracking (BTM)
- 9.1 ML
  - 9.1.1 Head pose estimator (MediaPipe Face Mesh) (BTM-01)
  - 9.1.2 Attention scorer (0–100, smoothed) (BTM-02)
  - 9.1.3 Posture/sleepiness detector (MediaPipe Pose) (BTM-03)
  - 9.1.4 Attention model optimization (BTM-07)
- 9.2 Backend
  - 9.2.1 Attention service (score, persist, aggregate)
  - 9.2.2 Class engagement average (BTM-04)
  - 9.2.3 Disengagement history (BTM-05)
  - 9.2.4 Attention routes (`/attention/*`)
  - 9.2.5 Integrate attention into detection WebSocket pipeline
- 9.3 Frontend
  - 9.3.1 Build full `AttentionAnalysis.jsx` (gauge, student grid, timeline)
  - 9.3.2 Attention badges in live roster (BTM-02)
  - 9.3.3 Engagement timeline component (BTM-06)
  - 9.3.4 Disengagement history view (BTM-05)

## 10.0 Module 7 — Academic Intervention & Alerting (AIM)
- 10.1 Backend
  - 10.1.1 Low-engagement detection (AIM-01)
  - 10.1.2 Risk-list generation (AIM-02)
  - 10.1.3 Custom threshold config (AIM-03)
  - 10.1.4 Centralized alert log (AIM-04)
  - 10.1.5 Notification channel config (AIM-05)
  - 10.1.6 Attendance↔attention correlation service (AIM-07)
  - 10.1.7 Alert routes (`/alerts/*`)
- 10.2 Frontend
  - 10.2.1 Real-time alert banner (AIM-01)
  - 10.2.2 Risk-list page (AIM-02)
  - 10.2.3 Threshold configuration UI (AIM-03)
  - 10.2.4 Notification preferences UI (AIM-05)
  - 10.2.5 Classroom engagement heatmap (AIM-06, RSM-05)
  - 10.2.6 Correlation report view (AIM-07)

## 11.0 Module 8 — Reporting & Statistical Summary (RSM)
- 11.1 Backend
  - 11.1.1 Real-time dashboard aggregation (RSM-01)
  - 11.1.2 Post-class engagement summary (RSM-02)
  - 11.1.3 Monthly at-risk report (RSM-03)
  - 11.1.4 Automated daily CSV/PDF generation (RSM-04)
  - 11.1.5 Focus heatmap data (RSM-05)
  - 11.1.6 Periodic email summary scheduler (RSM-06)
- 11.2 Frontend
  - 11.2.1 Wire `DashboardHome.jsx` to backend (RSM-01)
  - 11.2.2 Engagement summary view (RSM-02)
  - 11.2.3 Heatmap visualization (RSM-05)

## 12.0 Module 9 — Student Personal Portal (RSM-07)
- 12.1 Backend
  - 12.1.1 Portal endpoints (`/portal/me`, attendance, attention, courses)
- 12.2 Frontend
  - 12.2.1 Build `StudentPortal.jsx` (stats, calendar, trends)
  - 12.2.2 Student-role routing in `App.jsx`

## 13.0 Module 5 & 9 — System Administration & Course Management (SAM)
- 13.1 Course Management Backend (SAM-01)
  - 13.1.1 Course CRUD routes (`/courses/*`)
  - 13.1.2 Course-student assignment routes
- 13.2 Course Management Frontend
  - 13.2.1 Wire `CourseDashboard.jsx` to backend (remove `localStorage`)
- 13.3 System Administration Backend
  - 13.3.1 System health endpoint (CPU/RAM/disk/DB/model) (SA-01, SAM-04)
  - 13.3.2 Backup/restore endpoints (SA-03, SAM-02)
  - 13.3.3 Audit log endpoint (SA-04, SAM-06)
  - 13.3.4 SIS import endpoint with dedup (SA-05, SAM-07)
- 13.4 System Administration Frontend
  - 13.4.1 Build full `SystemSettings.jsx`
    - 13.4.1.1 User management tab (RBAC) (SAM-05)
    - 13.4.1.2 System health tab (SA-01)
    - 13.4.1.3 Backup & restore tab (SA-03)
    - 13.4.1.4 Audit log tab (SA-04)
    - 13.4.1.5 SIS import tab (SA-05)
    - 13.4.1.6 Notification config tab (AIM-05)

## 14.0 Quality Assurance & Testing
- 14.1 Backend Testing
  - 14.1.1 Configure pytest + in-memory test DB (`conftest.py`)
  - 14.1.2 Auth test suite
  - 14.1.3 Students/enrollment test suite
  - 14.1.4 Sessions/attendance test suite
  - 14.1.5 Reports/export test suite
  - 14.1.6 Alerts/attention test suite
- 14.2 Frontend Testing
  - 14.2.1 Configure Vitest
  - 14.2.2 Form validation tests
  - 14.2.3 API service layer tests (mocked)
  - 14.2.4 ProtectedRoute/routing tests
- 14.3 ML Testing
  - 14.3.1 Recognition accuracy validation
  - 14.3.2 Attention scoring validation
- 14.4 Cross-Cutting Tests (`tests/`)
  - 14.4.1 E2E flows (login → enroll → session → report)
  - 14.4.2 Load/performance tests (multi-face, concurrent sessions)
  - 14.4.3 Security/permission tests

## 15.0 Security & Hardening
- 15.1 Secure CORS, headers, and HTTPS
- 15.2 Rate limiting on auth endpoints
- 15.3 File upload validation (type, size, scanning)
- 15.4 Input sanitization and injection protection
- 15.5 Secrets management (no committed `.env`)
- 15.6 Biometric data encryption at rest and in transit
- 15.7 Security audit and penetration testing

## 16.0 Deployment, DevOps & Infrastructure
- 16.1 Containerization (`infra/docker/`)
  - 16.1.1 Backend Dockerfile
  - 16.1.2 Frontend Dockerfile
  - 16.1.3 ML service Dockerfile
  - 16.1.4 `docker-compose.yml` (db + backend + frontend + ml)
- 16.2 CI/CD (`infra/ci/`)
  - 16.2.1 Lint → test → build pipeline
  - 16.2.2 Automated model integrity check (SA-06, SAM-03)
  - 16.2.3 Deployment automation + rollback
- 16.3 Orchestration & Monitoring
  - 16.3.1 Kubernetes manifests (`infra/k8s/`) if used
  - 16.3.2 Monitoring/observability (`infra/monitoring/`)
  - 16.3.3 Centralized logging
- 16.4 Database Operations
  - 16.4.1 Backup/restore scripts (`scripts/backup_db.*`)
  - 16.4.2 Query indexing and performance tuning
  - 16.4.3 Roster embedding caching (Redis/memory)
- 16.5 CCTV/Data Tooling
  - 16.5.1 `scripts/collect_cctv_samples.*`

## 17.0 Documentation
- 17.1 Maintain `README.md` and module READMEs (current-state accuracy)
- 17.2 Author `project_overview.md`
- 17.3 Author `deployment_guide.md`
- 17.4 Author `testing_strategy.md`
- 17.5 Maintain `api_design.md` and `backend/docs/schema.md`
- 17.6 Author user/admin operation manuals
- 17.7 FYP report, literature review (`docs/literature_review/`), and presentation

## 18.0 Project Closure & Handover
- 18.1 Final acceptance testing against all 55 user stories
- 18.2 Performance and accuracy sign-off
- 18.3 Production deployment and smoke verification
- 18.4 Knowledge transfer and handover package
- 18.5 Post-deployment support and maintenance plan
- 18.6 Future-scope backlog (exam monitoring, advanced proctoring)
