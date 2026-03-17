Smart Attendance System using CCTV
==================================

This repository contains a full-stack smart attendance system that uses CCTV cameras and CNN-based facial recognition to:

- Automate attendance marking
- Estimate students' attention and focus levels
- Provide a foundation for future exam monitoring functionality

The structure of this repository follows the non-negotiable engineering requirements and folder conventions defined in `non-negociable-cursor-reqs.md`.

## Top-level structure

- `frontend/` – Next.js App Router frontend (TypeScript, static export, Azure Static Web Apps)
- `backend/` – FastAPI backend (Python 3.12, async, Poetry)
- `ml/` – CNN models, training, and inference utilities
- `infra/` – Deployment and environment configuration
- `scripts/` – Development and maintenance helper scripts
- `tests/` – Cross-cutting tests (e2e, load, security)
- `docs/` – Documentation and design artifacts

Smart Attendance System using CCTV
==================================

This repository contains a full-stack smart attendance system that uses CCTV cameras and CNN-based facial recognition to:

- Automate attendance marking
- Estimate students' attention and focus levels
- Provide a foundation for future exam monitoring functionality

## Repository structure

- `frontend/` – Web UI for students, teachers, and admins
- `backend/` – REST APIs, business logic, and database access
- `ml/` – CNN models, training, inference, and experiments
- `data/` – Local datasets and samples (mostly ignored from version control)
- `docs/` – Documentation, design notes, and reports
- `scripts/` – Development and maintenance helper scripts
- `infra/` – Deployment and environment configuration
- `tests/` – End-to-end and cross-cutting tests

## Getting started

The codebase is scaffolded but intentionally does not contain implementation code yet. Fill in each component according to your chosen tech stack (e.g., React/Next.js for the frontend, Node.js/Python for the backend, and PyTorch/TensorFlow for the ML components).

