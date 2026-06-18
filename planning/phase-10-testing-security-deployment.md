# Phase 10 — Testing, Security, Deployment & Closure

> **Priority:** 🟢 Medium · **Est. effort:** 3–5 days (plus continuous testing throughout)
> **WBS coverage:** 14.0 (QA & Testing), 15.0 (Security & Hardening), 16.0 (Deployment & DevOps), 17.0 (Documentation), 18.0 (Project Closure)
> **User stories:** SA-06, SAM-03 (model integrity on deploy); validation of all 55 stories.
> **Depends on:** Phases 0–9 (validates and hardens everything built).
> **Unblocks:** Production deployment, FYP handover.
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Make the system production-ready and prove it works: automated tests across backend/frontend/ML, security hardening, containerization and CI/CD, operational documentation, and formal closure (acceptance against all 55 user stories, sign-off, handover). Testing tasks run **continuously** alongside earlier phases; this phase consolidates, fills gaps, and finalizes.

---

## 2. Entry State (baseline from `project-current-state.md`)

- **No tests anywhere** (`tests/`, `backend/tests/conftest.py` empty; no Vitest config).
- **Security gaps:** CORS narrowed in Phase 0 but no rate limiting, no upload scanning, no HTTPS config, no biometric encryption at rest.
- **Infra:** `infra/docker/`, `infra/ci/`, `infra/k8s/`, `infra/monitoring/` are empty/stub; `backend/Dockerfile` is 0 bytes.
- **Docs:** strong planning docs; missing `project_overview.md`, `deployment_guide.md`, `testing_strategy.md`, operation manuals.
- `scripts/` is README-only (no backup/CCTV tooling).

---

## 3. Tasks

### 3.1 Testing (WBS 14.0)

- **10.1 Backend test harness (WBS 14.1.1)** → `backend/tests/conftest.py` with SQLite/in-memory async test DB fixtures; add `pytest`, `pytest-asyncio`, `httpx`.
- **10.2 Backend suites (WBS 14.1.2–14.1.6):** `test_auth.py` (register/login/token/roles/reset), `test_students.py` (CRUD/enroll/bulk/dup), `test_sessions.py` (create/close/mark/override/idempotency), `test_reports.py` (summaries/at-risk/export), `test_alerts.py` (alerts/risk-list/thresholds).
- **10.3 Frontend tests (WBS 14.2)** → configure Vitest; form-validation tests, API-service tests (mocked), `ProtectedRoute`/routing tests.
- **10.4 ML tests (WBS 14.3)** → recognition accuracy validation, attention scoring validation.
- **10.5 Cross-cutting tests (WBS 14.4)** → E2E (login → enroll → session → report), load/performance (multi-face, concurrent sessions), security/permission tests (incl. student-portal own-data scope from Phase 9).

### 3.2 Security & Hardening (WBS 15.0)

- **10.6 Secure CORS/headers/HTTPS (WBS 15.1)** — finalize the env-driven allow-list (started Phase 0), add security headers, HTTPS in production.
- **10.7 Rate limiting on auth (WBS 15.2)** — `slowapi` on login/register/forgot-password.
- **10.8 File-upload validation (WBS 15.3)** — type/size limits + scanning for avatar (Phase 2), face images (Phase 3), CSV/ZIP/SIS (Phases 3, 8).
- **10.9 Input sanitization & injection protection (WBS 15.4)**.
- **10.10 Secrets management (WBS 15.5)** — ensure no committed `.env`; document secret handling.
- **10.11 Biometric encryption at rest + in transit (WBS 15.6)** — encrypt stored embeddings; TLS in transit.
- **10.12 Security audit / pen-test pass (WBS 15.7)**.

### 3.3 Deployment & DevOps (WBS 16.0)

- **10.13 Containerization (WBS 16.1)** → `infra/docker/Dockerfile.backend`, `Dockerfile.frontend`, `Dockerfile.ml-service`, and `docker-compose.yml` (postgres + backend + frontend + ml).
- **10.14 CI/CD (WBS 16.2)** → `infra/ci/` GitHub Actions: lint → test → build → deploy; **automated model-integrity check on deploy** → **SA-06, SAM-03**; rollback support.
- **10.15 Orchestration & monitoring (WBS 16.3)** → optional k8s manifests, monitoring/observability, centralized logging.
- **10.16 Database operations (WBS 16.4)** → `scripts/backup_db.*`, query indexing/perf tuning, roster-embedding caching (Redis/memory — formalizes the Phase 4 in-session cache).
- **10.17 CCTV/data tooling (WBS 16.5)** → `scripts/collect_cctv_samples.*`.

### 3.4 Documentation (WBS 17.0)

- **10.18** Maintain `README.md` + module READMEs for current-state accuracy.
- **10.19** Author `docs/project_overview.md`, `docs/deployment_guide.md`, `docs/testing_strategy.md`.
- **10.20** Keep `api_design.md` + `backend/docs/schema.md` final.
- **10.21** Author user/admin operation manuals; FYP report, literature review, presentation.

### 3.5 Project Closure (WBS 18.0)

- **10.22** Final acceptance testing against all 55 user stories (WBS 18.1).
- **10.23** Performance + accuracy sign-off (WBS 18.2).
- **10.24** Production deployment + smoke verification (WBS 18.3).
- **10.25** Knowledge transfer + handover package (WBS 18.4).
- **10.26** Post-deployment support/maintenance plan (WBS 18.5).
- **10.27** Future-scope backlog: exam monitoring, advanced proctoring (WBS 18.6).

---

## 4. Contract Alignment Resolved Here

- No new product endpoints; this phase **validates** the contracts established in Phases 0–9 and hardens them (auth rate limits, upload validation, encryption).
- Confirms every frontend↔backend path resolved in earlier phases is covered by an E2E/integration test so regressions surface in CI.

---

## 5. Deliverables & Acceptance Criteria

- Green CI pipeline: lint + backend + frontend + ML tests pass on every push.
- E2E flow (login → enroll → live session → report) passes automatically.
- Security checklist (15.1–15.7) complete; no open `.env`, embeddings encrypted, auth rate-limited.
- `docker-compose up` brings up the full stack (db + backend + frontend + ml).
- Operational docs authored; all 55 stories verified against acceptance criteria.
- Handover package delivered; future-scope backlog recorded.

---

## 6. Exit Criteria (Definition of Done)

1. All 55 user stories pass acceptance (matches `requirements_specification.md`).
2. CI runs lint → test → build → deploy with model-integrity check + rollback (SA-06, SAM-03).
3. Full stack deploys via Docker; smoke test passes in the target environment.
4. Security hardening verified; performance/accuracy signed off.
5. Documentation complete; `agent.md` and `project-current-state.md` updated to reflect production readiness.

---

## 7. Alignment Notes

- **Consumes:** every prior phase (each phase's "Hands to Phase 10" notes feed here — auth tests, enrollment/ML accuracy, session idempotency, report correctness, alert logic, portal authorization).
- **Continuous, not just final:** write tests as each phase lands; this phase consolidates and adds cross-cutting/E2E/load/security coverage.
- **Formalizes deferrals:** the Phase 4 in-session embedding cache becomes the documented Redis/memory caching strategy here; the Phase 0 minimal CORS becomes the full security posture.
- **Closes the project:** acceptance, sign-off, deployment, handover, and the future-scope backlog (exam monitoring) complete the WBS.
