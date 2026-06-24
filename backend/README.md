# Backend

FastAPI backend for the Smart Attendance System.

> **Last updated:** 2026-06-18

## Current State

The backend is a **minimal skeleton**. Only three endpoints are implemented; all other planned modules exist as empty stub files.

### Implemented files

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app, CORS middleware, router registration |
| `app/api/v1/attendance.py` | Face enrollment + WebSocket detection routes |
| `app/services/ml_service.py` | MediaPipe face detection, blur validation, mock embeddings |

### Working endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Welcome / health message |
| `POST` | `/api/v1/attendance/enroll` | Enroll student face (min 10 images; mock 128-d embeddings) |
| `WS` | `/api/v1/attendance/ws/detect` | Real-time frame processing (MediaPipe detect; random matching) |

### Empty stubs (planned, not implemented)

```
app/config.py
app/api/dependencies.py
app/api/v1/auth.py, router.py, tasks.py
app/models/__init__.py
app/schemas/__init__.py
app/middleware/
app/integrations/
app/utils/
tests/conftest.py
docs/schema.md, public-routes.md
Dockerfile, pyproject.toml, poetry.lock
```

## Expected structure (target)

- `app/api/` – Route handlers only (no business logic)
  - `v1/` – Versioned API routers (`auth.py`, `students.py`, `sessions.py`, etc.)
  - `dependencies.py` – Shared FastAPI dependencies (auth, DB, pagination)
- `app/services/` – Business logic services
- `app/integrations/` – Third-party and ML service clients
- `app/models/` – Prisma/SQLAlchemy ORM models
- `app/schemas/` – Pydantic request/response models
- `app/utils/` – Stateless utility functions
- `app/middleware/` – ASGI middleware
- `app/config.py` – `pydantic-settings` configuration
- `migrations/` – Alembic migration files
- `tests/` – API and service unit tests

## Running locally

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

See [`docs/api_design.md`](../docs/api_design.md) for the full endpoint specification and gap analysis.
