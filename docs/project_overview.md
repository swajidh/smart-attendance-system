# Project Overview — Smart Attendance System

## Summary

The Smart Attendance System (SAS) is a university-focused, real-time attendance
and behavioural attention monitoring platform. It uses face recognition to mark
student attendance and head-pose estimation to assess engagement during live
lecture sessions. The system serves three user personas — students, lecturers /
teachers, and administrators — each with a dedicated interface.

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
│  (16-alpine)  │          │   FaceEncoder (FaceNet)          │
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
├── planning/                 Phase planning documents
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
| Face recognition | FaceNet (facenet-pytorch) |
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

| Role | Access |
|------|--------|
| `admin` | All features including system admin, SIS import, backup, user management |
| `teacher` | Course/session management, attendance override, reports, alerts |
| `counselor` | Read-only alerts, risk list, correlation reports |
| `student` | Personal portal (`/portal`) only — own data, read-only |

---

## API Reference

Full API documentation is available at `/docs` (Swagger UI) and `/redoc` when the
backend is running. See `docs/api_design.md` for the design specification.

---

## User Stories Coverage

All 55 user stories from `docs/requirements_specification.md` are implemented and
validated via the test suites in `backend/tests/` and frontend tests in
`frontend/src/test/`. Key stories:

- **SA-01 – SA-10**: Face enrollment, recognition, session management ✅
- **SAM-01 – SAM-05**: Attention monitoring, alerting ✅
- **SS-01 – SS-06**: Student portal, self-service access ✅
- **SA-06, SAM-03**: Model integrity on deploy (CI `model-integrity` job) ✅

---

## Future Scope

- **Exam monitoring** — extend attention tracking to exam sessions
- **Advanced proctoring** — multi-face detection, gaze tracking
- **Redis** — replace in-memory caches for multi-worker deployments
- **Kubernetes** — `infra/k8s/` manifests for large-scale deployment
