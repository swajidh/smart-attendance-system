# Cross-cutting tests

This directory is reserved for **end-to-end and cross-stack tests** that span frontend, backend, and infrastructure together.

> **Last updated:** 2026-06-18

## Current test locations

| Layer | Location | Runner |
|-------|----------|--------|
| Backend API & services | [`backend/tests/`](../backend/tests/) | pytest |
| Frontend components & utils | [`frontend/src/test/`](../frontend/src/test/) | Vitest |
| ML unit tests | [`backend/tests/test_attention_scorer.py`](../backend/tests/test_attention_scorer.py) | pytest |
| CI ML integrity | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | GitHub Actions |

See [`docs/testing_strategy.md`](../docs/testing_strategy.md) for the full strategy.

## Planned structure (not yet implemented)

```
tests/
├── e2e/              Playwright/Cypress full user flows
├── load_tests/       Performance and load tests
└── security_tests/   Penetration and permission fuzzing
```

## Running existing tests

```bash
# Backend
cd backend
TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/sas_test \
  pytest tests/ -v

# Frontend
cd frontend
npm run test -- --run
```

## Manual E2E checklist

1. Register staff (admin) → create student → enroll face (10+ samples)
2. Create course → enroll student → start live session
3. Verify WebSocket recognition + attention scores in Live Classroom
4. Close session → check reports dashboard and at-risk list
5. Login as student → verify `/portal` shows own data
6. Import counselor batch CSV → login as counselor → verify batch-scoped views
