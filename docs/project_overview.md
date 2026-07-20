# Project Overview — Smart Attendance System

## Summary

The Smart Attendance System (SAS) is a university-focused, real-time attendance
and behavioural attention monitoring platform. It uses face recognition to mark
student attendance and head-pose estimation to assess engagement during live
lecture sessions. The system serves four staff/student personas — students,
counselors, teachers, and administrators — each with a dedicated interface.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (React SPA)                   │
│   /dashboard (teacher/admin)  │  /portal (student)           │
└───────────────────┬──────────────────────────────────────────┘
                    │ HTTPS REST + WebSocket
┌───────────────────▼──────────────────────────────────────────┐
│              FastAPI Backend (Python 3.11)                    │
│  Auth · Courses · Sessions · Attendance · Reports            │
│  Alerts · Portal · System Admin                               │
└────────┬───────────────────────────┬─────────────────────────┘
         │ asyncpg                   │ in-process
┌────────▼──────┐          ┌─────────▼───────────────────────┐
│  PostgreSQL   │          │   ML Pipeline                    │
│  (16-alpine)  │          │   FaceEncoder (FaceNet/MobileNet)│
└───────────────┘          │   HeadPose (MediaPipe + solvePnP)│
                            │   AttentionScorer (EMA)          │
                            │   PostureDetector                │
                            └─────────────────────────────────┘
```

---

## Implemented Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Foundations & Architecture | ✅ Done |
| 1 | Database & Persistence (Alembic migrations) | ✅ Done |
| 2 | Authentication & User Management | ✅ Done |
| 3 | Face Enrollment & Recognition | ✅ Done |
| 4 | Attendance Processing (WebSocket) | ✅ Done |
| 5 | Reporting & Summaries | ✅ Done |
| 6 | Behavioural Attention Tracking | ✅ Done |
| 7 | Alerting & Intervention | ✅ Done |
| 8 | System Administration & Courses | ✅ Done |
| 9 | Student Personal Portal | ✅ Done |
| 10 | Testing, Security, Deployment | ✅ Done |

---

## Repository Structure

```
smart-attendance-system/
├── backend/                  FastAPI application
│   ├── app/
│   │   ├── api/v1/           REST + WebSocket routers
│   │   ├── models/           SQLAlchemy ORM models
│   │   ├── schemas/          Pydantic schemas
│   │   ├── services/         Business logic
│   │   └── utils/            Shared helpers (upload_validation etc.)
│   ├── alembic/              Database migrations
│   ├── tests/                pytest test suites
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 React + Vite SPA
│   ├── src/
│   │   ├── pages/            Dashboard and portal pages
│   │   ├── components/       Shared UI components
│   │   ├── services/         API client (axios)
│   │   └── test/             Vitest test suites
│   ├── package.json
│   └── vite.config.js
├── ml/                       ML pipeline modules
│   ├── face_encoder.py       FaceNet embeddings
│   ├── face_matcher.py       Cosine similarity matching
│   ├── head_pose.py          MediaPipe head-pose estimation
│   ├── attention_scorer.py   EMA attention scoring
│   └── posture_detector.py   Sustained posture detection
├── infra/
│   ├── docker/               Production Dockerfiles + nginx + compose
│   └── ci/                   (GitHub Actions lives at .github/workflows/)
├── scripts/                  Operational scripts (backup, CCTV sampling)
├── docs/                     Project documentation
├── .github/workflows/ci.yml  CI/CD pipeline
└── docker-compose.yml        Root dev compose
```

---

## Key Technologies

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI 0.109+ |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Face recognition | FaceNet (facenet-pytorch) or MobileNetV3 fallback |
| Head pose | MediaPipe + OpenCV solvePnP |
| Frontend | React 19 + Vite |
| Routing | React Router v7 |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Container | Docker + nginx |
| CI/CD | GitHub Actions |
| Rate limiting | slowapi |
| Email | fastapi-mail |

---

## User Roles

See **[roles.md](roles.md)** for the full permission matrix, registration flows, and implementation details.

| Role | Access |
|------|--------|
| `student` | Personal portal (`/portal`) only — own attendance, attention, and courses (read-only) |
| `counselor` | Dashboard read-only, batch-scoped — My Batch, alerts, at-risk, reports, correlation, attention |
| `teacher` | Live sessions, student/course management, face enrollment, reports & exports, alerts |
| `admin` | All teacher capabilities plus user management, system settings, backup, SIS import, counselor batch CSV, audit logs |

---

## API Reference

Full API documentation is available at `/docs` (Swagger UI) and `/redoc` when the
backend is running. See `docs/api_design.md` for the design specification.

---

## User Stories Coverage

All 55 user stories from `docs/requirements_specification.md` are implemented and
validated via the test suites in `backend/tests/` and frontend tests in
`frontend/src/test/`. Key stories:

- **UAM-01 – UAM-07**: Authentication, RBAC, profile ✅
- **FEM-01 – FEM-07**: Face enrollment and quality validation ✅
- **APM-01 – APM-07**: Live attendance via WebSocket ✅
- **BTM-01 – BTM-07**: Attention scoring and posture ✅
- **AIM-01 – AIM-07**: Alerts, thresholds, correlation ✅
- **RSM-01 – RSM-07**: Reports, exports, student portal ✅
- **SAM-01 – SAM-07, SA-01 – SA-06**: System admin, CI/CD, backups ✅

---

## Future Scope

- **Redis** — replace in-memory caches for multi-worker deployments
- **Kubernetes** — `infra/k8s/` manifests for large-scale deployment
- **Advanced proctoring** — custom smartwatch YOLO, seat maps, audio (post-v1 exam module enhancements)

> **Exam monitoring (v1)** — implemented as a separate module. See [`exam_monitoring.md`](exam_monitoring.md).
