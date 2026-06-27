# Testing Strategy — Smart Attendance System

## Philosophy

Tests are written **alongside** each phase rather than deferred. Phase 10
consolidates them into a running CI pipeline. Tests serve three goals:

1. **Correctness** — business logic (auth, attendance, attention, alerts) works as specified.
2. **Regression prevention** — changes to one module don't silently break another.
3. **Security validation** — role enforcement and own-data scoping are tested at every layer.

---

## Test Pyramid

```
        ┌──────────────────┐
        │  E2E / Smoke (CI)│  ← Docker + curl smoke tests
        ├──────────────────┤
        │ Integration       │  ← httpx AsyncClient + real Postgres
        ├──────────────────┤
        │ Unit (majority)  │  ← Pure logic, no I/O
        └──────────────────┘
```

---

## Backend Tests

### Setup

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt

# Requires a running PostgreSQL instance
export TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/sas_test
pytest tests/ -v
```

### Test suites

| File | Covers | Key assertions |
|------|--------|----------------|
| `tests/conftest.py` | Fixtures | async engine, per-test SAVEPOINT rollback, auth helpers |
| `tests/test_auth.py` | Authentication | register, login, JWT, /me, admin role management, logout blacklist |
| `tests/test_students.py` | Student CRUD | create/read/delete, duplicate roll_no rejection, search |
| `tests/test_sessions.py` | Session lifecycle | create, close, double-close 400/409, manual override, idempotency |
| `tests/test_reports.py` | Reports & exports | dashboard, summary, at-risk, trends (422 on bad period), CSV/PDF content-type |
| `tests/test_alerts.py` | Alerts & portal security | unit: threshold/tracker logic; API: list/resolve/thresholds; portal 403/404 |

### Isolation strategy

Each test runs inside a **SAVEPOINT transaction** that is rolled back after the test.
No test data persists to the next test. The test schema is created once per session
and dropped at the end.

### Coverage targets

| Layer | Target |
|-------|--------|
| Auth routes | 95% |
| Student routes | 85% |
| Session routes | 85% |
| Report services | 80% |
| Alert service (unit) | 90% |

---

## Frontend Tests

### Setup

```bash
cd frontend
npm ci
npm test        # watch mode
npm run test -- --run   # single pass (CI)
```

### Test suites

| File | Covers |
|------|--------|
| `src/test/loginValidation.test.js` | Form validation logic, role-based redirect |
| `src/test/ProtectedRoute.test.jsx` | Auth guard, student→portal redirect, role enforcement |
| `src/test/api.test.js` | Axios instance config, interceptor registration |

### Tools

- **Vitest** — test runner (Jest-compatible API)
- **@testing-library/react** — component rendering
- **@testing-library/jest-dom** — DOM matchers
- **jsdom** — browser environment simulation

---

## ML / Model Integrity Tests (WBS 14.3)

Validated in CI via `.github/workflows/ci.yml` — `model-integrity` job:

- `ml.head_pose` module imports successfully; `HEAD_POSE_READY` flag checked
- `ml.attention_scorer` — `update`, `get_class_average`, `should_persist` importable
- `ml.posture_detector` — `detect`, `clear_session` importable

Face recognition accuracy validation (offline):
```bash
python -c "
from ml.face_encoder import FaceEncoder
enc = FaceEncoder()
# Encode same image twice — cosine similarity should be > 0.95
import cv2, numpy as np
img = cv2.imread('tests/fixtures/face_sample.jpg')
e1 = enc.encode(img)
e2 = enc.encode(img)
sim = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
assert sim > 0.95, f'Encoding not deterministic: {sim}'
print('Face encoder determinism: OK', sim)
"
```

---

## Security Tests (WBS 14.4)

### Role enforcement matrix (tested in `test_alerts.py` and `test_reports.py`)

| Endpoint | student | teacher | counselor | admin |
|----------|---------|---------|-----------|-------|
| `GET /reports/at-risk` | 403 | 200 | 200 | 200 |
| `GET /alerts` | 403 | 200 | 200 | 200 |
| `DELETE /students/{id}` | 403 | 403 | 403 | 204 |
| `GET /portal/me` | 200 | 403 | 403 | 403 |
| `GET /system/health` | 403 | 403 | 403 | 200 |

### Own-data scoping (Phase 9 portal)

- `GET /portal/me` with teacher token → **403**
- `GET /portal/me` with student token but no linked Student → **404** (not 500)

### Rate limiting

- `POST /auth/login`: 10 req/min per IP → 429 on breach
- `POST /auth/register`: 20 req/min per IP → 429 on breach

---

## E2E Smoke Test (CI — `docker-build` job)

After a successful `docker compose up`:

```bash
# Health + ML
curl -f http://localhost:8000/health
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8000/api/v1/system/health | jq .ml

# Dashboard includes attention KPI
curl -f -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/reports/dashboard | jq .avg_attention

# Live session attention (manual)
# 1. Enroll student face → start session → verify WS sends attentionScore on faces
# 2. Close session → verify sessions.avg_class_attention populated
# 3. Counselor sees batch-scoped attention only on /reports/dashboard
# 4. Student portal /portal/attention shows weekly trend
```

---

## Running All Tests (CI locally)

```bash
# Backend
cd backend
TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/sas_test \
    pytest tests/ -v --tb=short

# Frontend
cd frontend
npm run test -- --run
```
