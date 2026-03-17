Backend
=======

This directory will contain the FastAPI backend for the smart attendance system, implemented in Python 3.12 and structured according to the non-negotiable requirements.

Expected structure (no implementation code yet):

- `app/`
  - `api/` – Route handlers only (no business logic)
    - `v1/` – Versioned API routers (e.g. `auth.py`, `attendance.py`, `router.py`)
    - `dependencies.py` – Shared FastAPI dependencies (auth, DB, pagination)
  - `services/` – Business logic services called by the API layer
  - `integrations/` – Third-party and ML service clients
  - `models/` – SQLAlchemy ORM models
  - `schemas/` – Pydantic request/response models and envelopes
  - `utils/` – Stateless utility functions
  - `middleware/` – ASGI middleware (request ID, logging, etc.)
  - `config.py` – `pydantic-settings` configuration
  - `main.py` – FastAPI app factory
- `migrations/` – Alembic migration files
  - `versions/` – Versioned migration scripts
- `tests/`
  - `api/` – Endpoint integration tests
  - `services/` – Unit tests for the service layer
  - `conftest.py` – Shared test fixtures
- `docs/`
  - `schema.md` – ER diagrams and table documentation
  - `public-routes.md` – Explicit list of public endpoints (if any)

Backend
=======

This directory will contain the backend API and business logic for the smart attendance system.

Suggested substructure:

- `src/`
  - `api/`
    - `routes/` – Route definitions (auth, attendance, analytics, monitoring, etc.)
    - `controllers/` – Request handlers and response mappers
    - `middlewares/` – Authentication, validation, logging, error handling
    - `validators/` – Request validation schemas
  - `services/` – Core business logic services
  - `repositories/` (or `models/`) – Database access layer
  - `db/` – Migrations, seeders, and schema definitions
  - `integrations/` – CCTV camera and ML service integrations
  - `config/` – Environment-aware configuration, constants, and logging
  - `utils/` – Shared helpers
  - `types/` – Shared type definitions
  - `app.*` / `server.*` – Application bootstrap and HTTP server entrypoints

