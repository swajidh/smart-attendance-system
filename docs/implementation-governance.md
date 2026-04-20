# Implementation Governance - Smart Attendance Prototype

Status: Active  
Scope: Phase 0 governance controls for backend + CV demo

---

## 1) Definition of Done (Demo Scope)

Phase 0 DoD is satisfied only when all conditions below are true:

- A recognized face results in an attendance log write in under 3 seconds on demo hardware.
- Unknown faces do not produce attendance records.
- Every demo API response follows the typed envelope contract.
- Request IDs are generated and surfaced in logs and response headers.
- Public routes are explicitly documented with justification.
- Demo commands are fixed and documented in `scripts/README.md`.

---

## 2) Public Route Governance

- Default rule: routes are protected unless explicitly marked public.
- Any public route requires:
  - route path and method
  - reason it must be public for prototype
  - owner responsible for re-securing it later
- Canonical route list: `backend/docs/public-routes.md`.

---

## 3) Demo Command Path (Agreed)

The prototype run path is fixed for reproducibility:

1. `scripts/start_backend.ps1`
2. `scripts/run_ml_demo.ps1`
3. `scripts/run_demo_check.ps1`

Any change to this command path must be updated in:

- `scripts/README.md`
- `implementation-plan.md`

---

## 4) Scope and Change Control

- Phase 0 focuses on governance only; no scope expansion into feature work.
- New requirements must be reflected in `implementation-plan.md` before implementation.
- If a requirement conflicts with `non-negociable-cursor-reqs.md`, the non-negotiable file wins.

---

## 5) Acceptance Sign-off

- Technical owner: Backend/CV engineering lead
- Sign-off criteria:
  - Phase 0 checklist marked complete in `implementation-plan.md`
  - Governance docs exist and are internally consistent
