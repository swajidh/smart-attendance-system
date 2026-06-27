# Backend

FastAPI backend for the Smart Attendance System.

> **Last updated:** 2026-06-18

## Quick start

```bash
cd backend
cp .env.example .env          # edit DATABASE_URL, SECRET_KEY, etc.
pip install -r requirements.txt
pip install -r requirements-test.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

> **Why `app.main:app`?** The FastAPI app lives in the `app` Python package at `app/main.py`. There is no top-level `main.py`.

## Docker (from repo root)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Runs Postgres, Alembic migrations, backend (with `ml/` package), and Vite frontend dev server.

## Environment variables

See [`.env.example`](.env.example). Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Async PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `FRONTEND_URL` | Base URL for email links |
| `STAFF_REGISTRATION_KEY` | Gate for staff self-registration |
| `MAIL_*` | SMTP for password reset emails |

## API modules

| Area | Path |
|------|------|
| Auth & RBAC | `app/api/v1/auth.py`, `app/core/permissions.py` |
| Students | `app/api/v1/students.py`, `app/services/student_service.py` |
| Courses | `app/api/v1/courses.py` |
| Sessions + live WS | `app/api/v1/sessions.py`, `app/services/session_service.py` |
| Reports & export | `app/api/v1/reports.py`, `app/services/report_service.py` |
| Attention | `app/api/v1/attention.py`, `app/services/attention_service.py` |
| Alerts | `app/api/v1/alerts.py`, `app/services/alert_service.py` |
| Counselor batches | `app/api/v1/batches.py`, `app/services/batch_service.py` |
| Student portal | `app/api/v1/portal.py` |
| System admin | `app/api/v1/system.py` |
| ML (repo root) | `ml/face_encoder.py`, `ml/attention_scorer.py`, etc. |

Full endpoint list: [`docs/api_design.md`](../docs/api_design.md)

## Database

10 SQLAlchemy models, 3 Alembic migrations:

```bash
alembic upgrade head
alembic revision --autogenerate -m "describe_change"
```

Optional seed:

```bash
python app/seed.py
```

## Attention scoring

During live sessions, `WS /api/v1/sessions/{id}/detect` runs face recognition then per-face head pose → 0–100 attention score. Scores persist to `attention_logs`; session aggregates stored on close.

Requires MediaPipe + OpenCV (`HEAD_POSE_READY=true`). Check `GET /api/v1/system/health` (admin) for ML status.

## Tests

```bash
TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/sas_test \
  pytest tests/ -v
```

| File | Scope |
|------|-------|
| `test_auth.py` | Register, login, JWT, admin |
| `test_students.py` | CRUD, RBAC, search |
| `test_sessions.py` | Session lifecycle, override |
| `test_session_attention_ws.py` | WebSocket attention payload |
| `test_attention.py` | Attention API, counselor scoping |
| `test_attention_scorer.py` | ML scorer unit tests |
| `test_reports.py` | Dashboard, exports, correlation |
| `test_alerts.py` | Thresholds, alert API |
| `test_batches.py` | CSV import, batch scoping |
| `test_rbac.py` | Cross-endpoint role boundaries |

## Lint (CI)

```bash
flake8 app/ --max-line-length=120 --exclude=__pycache__,alembic
black --check --line-length=120 app/ tests/
isort --check-only --profile black app/ tests/
```

See [`docs/deployment_guide.md`](../docs/deployment_guide.md) for production setup.
