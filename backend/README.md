# Backend — Smart Attendance API

FastAPI (Python 3.12) backend with async SQLAlchemy, JWT auth, and attendance session APIs.

## Structure

```
app/
  api/v1/          # Route handlers (health, auth, attendance)
  services/        # Business logic
  models/          # SQLAlchemy ORM
  schemas/         # Pydantic request/response + ApiResponse envelope
  integrations/    # ML service HTTP client
  db/              # Async session factory
  middleware/      # Request ID
migrations/        # Alembic
tests/
```

## Setup

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL and SECRET_KEY

poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

Development seeds a default admin when the database is empty:

- Email: `admin@example.com`
- Password: `ChangeMe123!`

## API (v1)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/health` | Public |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public |
| GET | `/api/v1/auth/me` | Bearer |
| POST | `/api/v1/attendance/sessions` | Teacher/Admin |
| POST | `/api/v1/attendance/sessions/{id}/close` | Teacher/Admin |
| POST | `/api/v1/attendance/sessions/{id}/mark` | Teacher/Admin |
| GET | `/api/v1/attendance/sessions/{id}/records` | Bearer |

OpenAPI docs: `http://localhost:8000/docs`

## Tests

```bash
poetry run pytest
```
