# Documentation

Design artifacts and reference documentation for the Smart Attendance System (AttendAI).

> **Last updated:** 2026-06-18

---

## Core documents

| File | Description |
|------|-------------|
| [`project_overview.md`](project_overview.md) | Architecture, tech stack, repository layout |
| [`requirements_specification.md`](requirements_specification.md) | 55 user stories across 9 modules (all implemented) |
| [`api_design.md`](api_design.md) | Implemented REST and WebSocket endpoints |
| [`roles.md`](roles.md) | RBAC matrix, registration flows, counselor batches |
| [`deployment_guide.md`](deployment_guide.md) | Local and production deployment |
| [`testing_strategy.md`](testing_strategy.md) | Backend, frontend, ML, and CI testing |
| [`project_audit_report.md`](project_audit_report.md) | Module-by-module implementation audit |
| [`development_todo.md`](development_todo.md) | Phase roadmap (all phases complete) |
| [`apm_implementation_plan.md`](apm_implementation_plan.md) | Attendance processing module design & status |
| [`exam_monitoring.md`](exam_monitoring.md) | Exam hall proctoring — calibration, violations, review workflow |

---

## Related READMEs

| Path | Description |
|------|-------------|
| [`../README.md`](../README.md) | Project root — quick start and feature summary |
| [`../backend/README.md`](../backend/README.md) | Backend setup and modules |
| [`../frontend/README.md`](../frontend/README.md) | Frontend routes and structure |
| [`../infra/README.md`](../infra/README.md) | Docker and production infrastructure |
| [`../scripts/README.md`](../scripts/README.md) | Operational scripts |

---

## Live API documentation

When the backend is running:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Local-only files (not in git)

The following are excluded via `.gitignore` and kept for local development only:

- `planning/` — phase planning notes
- `agent.md` — agent session state snapshot
