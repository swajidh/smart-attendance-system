# Phase 0 — Foundations, Standards & Architecture

> **Priority:** 🔴 Critical · **Est. effort:** 3–4 days
> **WBS coverage:** 1.0 (Governance), 2.0 (Requirements & Architecture), 3.1 (Dev Environment), 3.2 (Backend Skeleton), 3.4 (Frontend Foundation cleanup)
> **User stories:** None directly — enabling/governance work that every later phase depends on.
> **Depends on:** Nothing (entry phase).
> **Unblocks:** All phases (establishes conventions, runnable skeleton, and architecture references).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Turn the current "frontend prototype + 3-endpoint backend" into a coherent, convention-driven foundation: a runnable dev environment, a properly structured backend application skeleton (router aggregation, config, middleware, dependencies), cleaned-up frontend routing, and the architecture/design docs that the rest of the build references. **No business features ship here** — this phase removes ambiguity and fixes the structural debt that would otherwise block Phases 1–10.

---

## 2. Entry State (baseline from `project-current-state.md`)

- Backend is 3 working endpoints (`GET /`, `POST /api/v1/attendance/enroll`, `WS /api/v1/attendance/ws/detect`) in `backend/app/main.py`, `backend/app/api/v1/attendance.py`, `backend/app/services/ml_service.py`.
- These are 0-byte stubs: `config.py`, `api/dependencies.py`, `api/v1/router.py`, `api/v1/auth.py`, `api/v1/tasks.py`, `models/__init__.py`, `schemas/__init__.py`, `middleware/__init__.py`, `integrations/__init__.py`, `utils/__init__.py`.
- CORS is `allow_origins=["*"]` in `main.py`.
- Frontend: React 19 + Vite 8 + Tailwind 3 + React Router 7. Landing + dashboard shell complete; auth routes commented out in `App.jsx`.
- Known structural debt: duplicate landing files (`pages/landing/` vs `components/landing/`), broken sidebar routes (`/dashboard/attendance`, `/dashboard/alerts`), logout → non-existent `/login`.
- `non-negociable-cursor-reqs.md` specifies Next.js/TS — **conflicts** with the actual React/Vite/JSX stack.
- `scripts/`, `infra/`, `tests/` are README-only. `ml/` is empty.
- Missing design docs: `system_architecture.md`, `ml_design.md`, `ui_ux_design.md`.

---

## 3. Tasks

### 3.1 Governance & Standards (WBS 1.3, 1.4)

- **0.1 Reconcile architecture-spec conflict (WBS 1.3.3).** Add a decision note to `non-negociable-cursor-reqs.md` (or a new `docs/adr/0001-frontend-stack.md`) declaring **React 19 + Vite + plain JSX** as the authoritative stack. All later phases follow this. *No TypeScript/Next.js migration.*
- **0.2 Define coding standards (WBS 1.3.2)** in `docs/contributing.md`: Python (PEP 8, type hints, async services), JSX (functional components, hooks), ML (module layout under `ml/`).
- **0.3 Define git/branch/PR + API versioning policy (WBS 1.3.1, 1.3.4)** in `docs/contributing.md`: branch naming, commit style, PR review, and that the API is versioned under `/api/v1`.
- **0.4 Privacy & ethics stubs (WBS 1.4).** Create `docs/privacy_and_ethics.md` covering biometric consent, data retention/deletion of faces/embeddings/footage, and attention-tracking ethical-use guidelines. Content is finalized as those features land (Phases 3, 6) but the policy file is established now.

### 3.2 Architecture & Design Docs (WBS 2.2, 2.3, 2.4, 2.5)

- **0.5 Author `docs/system_architecture.md` (WBS 2.2).** Component diagram (frontend ↔ backend ↔ ML ↔ DB), data-flow, real-time pipeline (WebSocket, ~5 FPS, latency budget), deployment topology.
- **0.6 Define the API contract baseline (WBS 2.3.2, 2.3.4).** Extend `docs/api_design.md` with the **standard response envelope** and **error model** all routes will use, plus the route-path alignment decisions (see §4).
- **0.7 Author `backend/docs/schema.md` outline (WBS 2.3.1).** ER overview of the 9 entities to be implemented in Phase 1 (User, Student, Course, Course-Student, Session, Attendance, AttentionLog, Alert, AuditLog). Detailed columns finalized in Phase 1.
- **0.8 Author `docs/ml_design.md` (WBS 2.4).** Model selection (FaceNet `InceptionResnetV1`/MTCNN, 512-d embeddings), matching strategy (cosine, threshold ~0.6), attention/head-pose approach (MediaPipe Face Mesh + Pose). Implemented in Phases 3 and 6.
- **0.9 Author `docs/ui_ux_design.md` (WBS 2.5).** Role-based navigation/access map (admin, teacher, counselor, student) and the canonical route list — this becomes the contract for Phase 2 RBAC gating and Phase 9 student routing.

### 3.3 Backend Application Skeleton (WBS 3.2)

- **0.10 Implement `backend/app/config.py` (WBS 3.2.1).** `pydantic-settings` `Settings` reading `.env` (DATABASE_URL, SECRET_KEY, ALGORITHM, token expiry, mail settings). Provide `.env.example`. *Values consumed in Phase 1.*
- **0.11 Implement `backend/app/api/v1/router.py` (WBS 3.2.2).** `APIRouter` that aggregates sub-routers; mount under `/api/v1` in `main.py`. Move the existing attendance router into this aggregation (keep its current endpoints working).
- **0.12 Implement `backend/app/api/dependencies.py` (WBS 3.2.3).** Skeleton for `get_db` (filled in Phase 1), pagination params helper, and placeholders for `get_current_user`/`require_role` (filled in Phase 2). Keep importable now.
- **0.13 Implement middleware (WBS 3.2.4)** in `backend/app/middleware/`: request-ID injection, structured request logging, and a global exception handler that returns the standard error envelope.
- **0.14 Harden CORS (WBS 3.2.5).** Replace `allow_origins=["*"]` with an env-driven allow-list (default `http://localhost:5173`). Full security hardening completes in Phase 10.

### 3.4 Dev Environment & Scripts (WBS 3.1)

- **0.15 Implement `scripts/setup_dev_env.*` (WBS 3.1.1)** — PowerShell + bash variants: create venv, install `backend/requirements.txt`, install `frontend` deps, copy `.env.example`→`.env`.
- **0.16 Implement `scripts/start_dev.*` (WBS 3.1.2)** — start backend (`uvicorn app.main:app --reload --port 8000`) and frontend (`npm run dev`) together.
- **0.17 Environment-variable strategy (WBS 3.1.3).** Document `backend/.env` and frontend `VITE_API_URL` usage in `docs/contributing.md`; ensure `.env` is git-ignored.

### 3.5 Frontend Foundation Cleanup (WBS 3.4.4, 3.4.5)

- **0.18 Remove duplicate landing files (WBS 3.4.4).** Delete the unused `frontend/src/pages/landing/*` duplicates; keep `frontend/src/components/landing/*` (the set imported by `LandingPage.jsx`). Verify the landing page still renders.
- **0.19 Fix broken sidebar routes (WBS 3.4.5).** In `frontend/src/components/dashboard/Sidebar.jsx`, point `/dashboard/attendance` and `/dashboard/alerts` to defined routes (or add placeholder route components that later phases fill: Attendance→LiveClassroom area, Alerts→Phase 7). No more silent redirect to `/`.
- **0.20 Confirm API client conventions.** Verify `frontend/src/services/api.js` base URL (`VITE_API_URL` → `/api/v1`) and JWT header attachment are consistent with the envelope/error model from 0.6 (no behavior change yet; auth wired in Phase 2).

> Tasks 0.18–0.20 are the only frontend changes in this phase. The UI itself is not refactored — only structural debt is removed.

---

## 4. Contract Alignment Resolved Here

This phase **documents and locks** the path/shape decisions; later phases implement them:

| Frontend currently calls | Backend currently provides | Decision (recorded in `api_design.md`) |
|--------------------------|----------------------------|----------------------------------------|
| `POST /students/{id}/enroll` | `POST /attendance/enroll` | Canonical = `POST /api/v1/students/{id}/enroll-face` (Phase 3) |
| `WS /sessions/{id}/detect` | `WS /attendance/ws/detect` | Canonical = `WS /api/v1/sessions/{id}/detect` (Phase 4) |
| envelope per-page ad hoc | ad hoc | Standard `{ status, data/message, errors }` (all phases) |

---

## 5. Deliverables & Acceptance Criteria

- Backend boots with the new `router.py` aggregation; the 3 existing endpoints still work under `/api/v1`.
- `config.py` loads settings from `.env` without error; `.env.example` committed.
- CORS restricted to the configured frontend origin.
- Middleware adds request IDs and returns the standard error envelope on unhandled exceptions.
- `scripts/setup_dev_env.*` and `scripts/start_dev.*` run on Windows PowerShell and bring up both services.
- Landing page renders with duplicate files removed; sidebar has no dead links; logout target decided (real `/login` arrives in Phase 2 — until then it routes to a defined placeholder, not a 404).
- Docs authored: `system_architecture.md`, `ml_design.md`, `ui_ux_design.md`, `privacy_and_ethics.md`, `contributing.md`; `api_design.md` extended with envelope/error model; `backend/docs/schema.md` outline present.
- Stack decision recorded (React/Vite/JSX authoritative).

---

## 6. Exit Criteria (Definition of Done)

1. `git clone` → run `scripts/setup_dev_env` → `scripts/start_dev` → both services up, frontend talks to `/api/v1` health check.
2. Backend package imports cleanly with all skeleton modules non-empty and wired through `router.py`.
3. Conventions (envelope, error model, route paths, roles, RBAC plan) are written down and referenced by Phases 1–10.
4. No dead frontend routes; no duplicate landing files.

---

## 7. Alignment Notes

- **Consumes:** nothing (entry phase).
- **Unblocks Phase 1:** `config.py` + `dependencies.get_db` skeleton + `schema.md` outline are the entry points for the database layer.
- **Unblocks Phase 2:** `dependencies.get_current_user/require_role` placeholders, `ui_ux_design.md` access map, and the auth route stub `api/v1/auth.py` are ready to fill.
- **Unblocks Phases 3–4:** the canonical route-path and envelope decisions prevent the frontend↔backend mismatches documented in `project-current-state.md` §6.4.
- **Defers to Phase 10:** full security hardening, tests, Docker/CI (only minimal CORS + skeleton here).
