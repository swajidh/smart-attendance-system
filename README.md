# Smart Attendance System (AttendAI)

A full-stack platform for automated classroom attendance and behavioural attention monitoring. It uses face recognition to mark attendance and head-pose estimation to score student engagement during live sessions.

**Stack:** React 19 · Vite 8 · FastAPI · PostgreSQL 16 · MediaPipe · Docker · GitHub Actions

---

## Repository structure

| Path | Purpose |
|------|---------|
| [`backend/`](backend/) | FastAPI REST API, WebSocket live detection, business logic, Alembic migrations |
| [`frontend/`](frontend/) | React SPA — staff dashboard, student portal, auth pages |
| [`ml/`](ml/) | Face detection/encoding/matching, head pose, attention scoring, posture detection |
| [`docs/`](docs/) | Requirements, API reference, deployment, testing, roles |
| [`infra/docker/`](infra/docker/) | Production Dockerfiles, nginx, compose |
| [`scripts/`](scripts/) | DB backup and CCTV sample collection |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Lint, test, ML integrity, Docker smoke build, deploy |
| [`docker-compose.yml`](docker-compose.yml) | Local dev stack (Postgres + migrate + backend + frontend) |

> **Note:** `planning/` and `agent.md` are local-only (listed in `.gitignore`).

---

## Features (implemented)

- **Authentication & RBAC** — JWT login, student/staff signup, password reset, four roles (`student`, `teacher`, `counselor`, `admin`)
- **Student & face enrollment** — CRUD, CSV import, guided webcam capture (10+ samples), quality validation, real embeddings
- **Live classroom** — WebSocket face recognition, attendance marking, manual override, session close
- **Attention tracking** — Per-student 0–100 scores from head pose, posture labels, class average, DB persistence
- **Reports & exports** — Dashboard KPIs, at-risk lists, trends, correlation, CSV/PDF export
- **Alerts** — Low engagement detection, risk list, configurable thresholds, notification prefs
- **Counselor batches** — CSV intake assignment, batch-scoped dashboard for counselors
- **Student portal** — Own attendance, attention, and course data at `/portal`
- **System admin** — User management, health/ML status, backup/restore, SIS import, audit log

---

## Quick start

### Docker (recommended)

```bash
git clone <repo-url>
cd smart-attendance-system
cp backend/.env.example backend/.env   # edit SECRET_KEY etc.
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend (Vite dev) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |

Migrations run automatically via the `migrate` service before the backend starts.

Optional seed data:

```bash
docker compose exec backend python app/seed.py
```

### Local development (without Docker)

**Backend** (from `backend/`):

```bash
cp .env.example .env
pip install -r requirements.txt -r requirements-test.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend** (from `frontend/`):

```bash
npm install
# create frontend/.env with: VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

**Tests:**

```bash
# Backend (requires Postgres)
cd backend
TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/sas_test pytest tests/ -v

# Frontend
cd frontend
npm run test -- --run
npm run lint
```

---

## API overview

Base URL: `http://localhost:8000/api/v1`

| Prefix | Module |
|--------|--------|
| `/auth` | Login, register, profile, admin users |
| `/students` | Student CRUD, face enrollment, bulk import |
| `/courses` | Course CRUD, student enrollment |
| `/sessions` | Session lifecycle; `WS /sessions/{id}/detect` for live recognition |
| `/reports` | Analytics, at-risk, trends, CSV/PDF export |
| `/attention` | Live scores, timelines, history |
| `/alerts` | Alert log, risk list, thresholds |
| `/batches` | Counselor batch CSV import and roster |
| `/portal` | Student self-service (student role only) |
| `/system` | Health, backup, audit, SIS import |

Full reference: [`docs/api_design.md`](docs/api_design.md) · Interactive: `/docs`

---

## Roles

| Role | Access |
|------|--------|
| **Student** | `/portal` — own data only |
| **Counselor** | Dashboard (batch-scoped) — alerts, reports, attention |
| **Teacher** | Live sessions, students, courses, exports |
| **Admin** | Full access including system settings and batch import |

Details: [`docs/roles.md`](docs/roles.md)

---

## CI/CD

On push/PR to `main` or `develop`:

1. Backend lint (flake8, black, isort)
2. Backend tests (pytest + Postgres)
3. ML module integrity
4. Frontend lint (ESLint)
5. Frontend tests (Vitest)
6. Docker image smoke build (`main` branch only)
7. Production deploy via SSH (`main` push only)

Downstream jobs are skipped when an upstream job fails (e.g. tests skip if lint fails).

See [`docs/deployment_guide.md`](docs/deployment_guide.md) and [`docs/testing_strategy.md`](docs/testing_strategy.md).

---

## Documentation index

| Document | Description |
|----------|-------------|
| [`docs/project_overview.md`](docs/project_overview.md) | Architecture and technology stack |
| [`docs/requirements_specification.md`](docs/requirements_specification.md) | 55 user stories (all implemented) |
| [`docs/api_design.md`](docs/api_design.md) | Implemented API endpoints |
| [`docs/roles.md`](docs/roles.md) | RBAC matrix and counselor batches |
| [`docs/deployment_guide.md`](docs/deployment_guide.md) | Production deployment |
| [`docs/testing_strategy.md`](docs/testing_strategy.md) | Test suites and CI |
| [`docs/project_audit_report.md`](docs/project_audit_report.md) | Module completion audit |
| [`backend/README.md`](backend/README.md) | Backend setup |
| [`frontend/README.md`](frontend/README.md) | Frontend routes and structure |
