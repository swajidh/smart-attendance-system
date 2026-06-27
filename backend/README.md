# Backend

FastAPI backend for the Smart Attendance System.

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

## Docker (from repo root)

```bash
docker compose up --build
```

Runs Postgres, migrations, backend (with `ml/` package), and Vite frontend dev server.

## Key modules

| Area | Path |
|------|------|
| Auth & RBAC | `app/api/v1/auth.py`, `app/core/permissions.py` |
| Sessions + live WS | `app/api/v1/sessions.py` |
| Attention API | `app/api/v1/attention.py` |
| Attention aggregates | `app/services/attention_aggregates.py` |
| Reports | `app/api/v1/reports.py`, `app/services/report_service.py` |
| ML (repo root) | `ml/attention_scorer.py`, `ml/head_pose.py` |

## Attention scoring

During live sessions, the WebSocket at `/api/v1/sessions/{id}/detect` runs face recognition then **per-face head pose → 0–100 attention score**. Scores persist to `attention_logs` and session-level aggregates on close.

Requires MediaPipe + OpenCV (`HEAD_POSE_READY=true`). Check `/api/v1/system/health` (admin) for ML status.

## Tests

```bash
TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/sas_test \
  pytest tests/ -v
```

See [`docs/deployment_guide.md`](../docs/deployment_guide.md) for production setup.
