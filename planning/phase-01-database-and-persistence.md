# Phase 1 — Database & Persistence Layer

> **Priority:** 🔴 Critical · **Est. effort:** 2–3 days
> **WBS coverage:** 3.3 (Database Layer)
> **User stories:** None directly — infrastructure prerequisite for **all** modules.
> **Depends on:** Phase 0 (`config.py`, `dependencies.get_db` skeleton, `schema.md` outline, conventions).
> **Unblocks:** Phases 2–9 (every persistent feature).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Stand up real, persistent storage to replace the two volatile stores in use today (browser `localStorage` and the backend in-memory `student_embeddings` dict). Deliver PostgreSQL, an async SQLAlchemy engine/session, the full ORM model set for all 9 entities, Alembic migrations, and a seed script. After this phase, the backend can persist and query real data; no feature logic ships yet, but every later phase writes to a real database.

---

## 2. Entry State (baseline from `project-current-state.md`)

- **No database.** `backend/requirements.txt` lists SQLAlchemy, asyncpg, Alembic but none are wired.
- `backend/app/models/__init__.py` is a 0-byte stub.
- Backend embeddings live in `MLService.student_embeddings` (in-memory dict, lost on restart).
- Frontend persists everything to `localStorage` keys: `smart_attendance_enrolled_students`, `smart_attendance_courses`, `smart_attendance_session_logs`, `smart_attendance_user`, `smart_attendance_token`.
- Phase 0 delivered `config.py` (with `DATABASE_URL`) and a `get_db` skeleton.

---

## 3. Tasks

### 3.1 Provision PostgreSQL (WBS 3.3.1)

- **1.1 Local + containerized Postgres.** Provide both: a local install path and a Docker one-liner —
  ```bash
  docker run -d --name sas-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=smart_attendance_db -p 5432:5432 postgres:16
  ```
- Populate `backend/.env` with `DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/smart_attendance_db` (matches `config.py` from Phase 0).
- Decide embedding storage: `pgvector` column **or** `LargeBinary`/`JSON` array. Record the choice in `backend/docs/schema.md`. (Default recommendation: start with a serialized float array column to avoid the `pgvector` extension dependency; revisit in Phase 3/10 for performance.)

### 3.2 Async engine & session (WBS 3.3.2)

- **1.2 Implement `backend/app/models/__init__.py`:** `create_async_engine(settings.DATABASE_URL)`, `async_session` factory, `Base(DeclarativeBase)`, and `async def get_db()` yielding a session. Wire `dependencies.get_db` (Phase 0 skeleton) to this.

### 3.3 ORM Models (WBS 3.3.3)

Implement each in `backend/app/models/` (one module per entity, all importing `Base`):

- **1.3a `user.py` (3.3.3.1)** — `id`, `email`(unique), `password_hash`, `name`, `role`(enum: admin/teacher/counselor/student), `avatar_url`, `bio`, `created_at`.
- **1.3b `student.py` (3.3.3.2)** — `id`, `student_id`(unique), `name`, `roll_no`(unique), `email`, `department`, `embedding`(vector/array, nullable), `embedding_status`(enum: none/processing/enrolled/failed), `enrollment_date`, `user_id`(FK→User, nullable for self-registered link).
- **1.3c `course.py` (3.3.3.3)** — `id`, `code`(unique), `name`, `instructor_id`(FK→User), `slots`(JSON), `created_at`.
- **1.3d `course_student.py` (3.3.3.4)** — `id`, `course_id`(FK), `student_id`(FK); many-to-many junction with uniqueness constraint.
- **1.3e `session.py` (3.3.3.5)** — `id`, `session_id`(unique), `course_id`(FK), `start_time`, `end_time`, `status`(enum: active/closed).
- **1.3f `attendance.py` (3.3.3.6)** — `id`, `session_id`(FK), `student_id`(FK), `status`(enum: present/absent/unknown), `first_seen`, `marked_by`(enum: system/manual), `modified_by`(FK→User, nullable), `modified_at`.
- **1.3g `attention_log.py` (3.3.3.7)** — `id`, `session_id`(FK), `student_id`(FK), `score`(float), `head_pose`(JSON), `timestamp`.
- **1.3h `alert.py` (3.3.3.8)** — `id`, `student_id`(FK), `alert_type`(enum), `severity`(enum), `message`, `resolved`(bool), `created_at`.
- **1.3i `audit_log.py` (3.3.3.9)** — `id`, `user_id`(FK), `action`, `entity_type`, `entity_id`, `old_value`(JSON), `new_value`(JSON), `timestamp`.

Define relationships/back-populates so later services can navigate (e.g. `Session.attendance_records`, `Course.students`).

### 3.4 Migrations (WBS 3.3.4)

- **1.4 Configure Alembic.** `alembic init alembic`; edit `alembic/env.py` to import `Base` + all models and use the async engine URL. Generate and apply the initial migration:
  ```bash
  alembic revision --autogenerate -m "initial_schema"
  alembic upgrade head
  ```

### 3.5 Seed (WBS 3.3.5)

- **1.5 Implement `backend/app/seed.py`:** insert a default admin user (hashed password — hashing util lands in Phase 2, so use a placeholder or import the bcrypt helper if built in parallel), plus optional sample course/students for local testing. Idempotent (no duplicate inserts on re-run).

---

## 4. Contract Alignment Resolved Here

- Defines the **schema** that every later route serializes via Pydantic schemas. The frontend `localStorage` record shapes (students, courses, session logs) in `project-current-state.md` §11 inform the model columns so that wiring (Phases 3–8) is a 1:1 mapping, not a reshape.
- No HTTP routes added in this phase.

---

## 5. Deliverables & Acceptance Criteria

- `alembic upgrade head` creates all 9 tables in `smart_attendance_db`.
- A trivial script can open `get_db()`, insert a `User`, and read it back.
- `seed.py` produces a default admin and is safe to re-run.
- `backend/docs/schema.md` filled with final columns, enums, FKs, and the embedding-storage decision.
- Engine config reads `DATABASE_URL` from `config.py` (no hardcoded credentials).

---

## 6. Exit Criteria (Definition of Done)

1. Migrations apply cleanly from an empty database and are reversible (`downgrade`).
2. All models import without circular-import errors and are visible to Alembic autogenerate.
3. `get_db` dependency yields a working async session usable by routes.
4. Default admin exists after seeding.

---

## 7. Alignment Notes

- **Consumes:** Phase 0 `config.py`, `get_db` skeleton, `schema.md` outline, conventions.
- **Unblocks Phase 2:** `User` model + `get_db` are the substrate for auth/RBAC.
- **Unblocks Phase 3:** `Student` + embedding column replace the in-memory dict; `Course`/`CourseStudent` support enrollment scoping.
- **Unblocks Phase 4+:** `Session`, `Attendance`, `AttentionLog`, `Alert`, `AuditLog` are ready to be written by their respective services.
- **Note:** the `Course` model is created here, but its CRUD **API/UI** is scheduled in Phase 8 (matching `docs/development_todo.md`). Phases 4–5 read courses via the model + minimal queries until then.
