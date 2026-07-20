# Exam Monitoring Module

Vision-only exam hall proctoring for hall/CCTV camera feeds. This module is **fully separate** from live classroom attendance and attention scoring.

> **Last updated:** 2026-06-18

---

## Overview

| Aspect | Live Classroom | Exam Monitoring |
|--------|----------------|-----------------|
| Purpose | Mark attendance + engagement | Detect sustained cheating signals |
| Data model | `Session`, `Attendance` | `ExamSession`, `ExamViolation` |
| ML pipeline | `attention_scorer`, face match | `exam_pipeline`, YOLO, gaze engine |
| Outcome | Present/absent + attention score | Violation log + snapshot evidence |
| Review | Manual attendance override | Human confirm/dismiss violations |

Design principle: violations are **sustained events with evidence**, reviewed by a human. A single frame never auto-fails a student.

---

## Workflow

1. **Create exam** — Teacher selects course and room (`POST /api/v1/exams`).
2. **Start** — Moves session to `calibrating` (`POST /api/v1/exams/{id}/start`).
3. **Calibrate (30s)** — WebSocket streams frames; pose samples collected. Students look at exam paper.
4. **Finalize calibration** — Room baseline yaw/pitch computed (`POST /api/v1/exams/{id}/calibrate`); status → `active`.
5. **Monitor** — WebSocket `WS /api/v1/exams/{id}/monitor?token=` processes frames; sustained violations logged with JPEG snapshots.
6. **Close** — End session (`PUT /api/v1/exams/{id}/close`).
7. **Review** — Staff confirm or dismiss violations in **Exam Review** UI; export integrity PDF.

---

## Violation types (v1)

Exam monitoring focuses on **behavior and prohibited items**, not hall identity. Staff, visitors, and unenrolled people in the room are expected and are **not** flagged.

| Type | Description | Default sustain |
|------|-------------|-----------------|
| `gaze_away` | Enrolled student head/eyes not toward paper (calibrated baseline) | 4s |
| `phone_detected` | COCO cell phone visible (YOLOv8n) | 1s |
| `unauthorized_object` | Book/notes when not allowed | 2s |
| `smartwatch_suspected` | Hand-near-wrist heuristic (suspected, not confirmed) | 5s |

Legacy enum values (`unknown_face`, `multiple_faces`, `face_absent`) may appear on older sessions but are **no longer generated** by the ML pipeline.

All violations default to `review_status: pending`. Dismissed violations require a review note and are excluded from integrity scoring in reports.

---

## Calibration

During calibration, the system collects matched-student head poses and computes **room median** `baseline_yaw` and `baseline_pitch`.

**Normal at desk (post-calibration):**

- Looking down at paper: pitch near baseline (+15° to +45° relative to lecture “forward” pose)
- Horizontal head turn: `|yaw - baseline_yaw| ≤ 28°` (configurable)

**Violation triggers:**

- `|yaw - baseline_yaw| > EXAM_GAZE_YAW_THRESHOLD` (default 28°)
- `pitch < baseline_pitch - EXAM_GAZE_PITCH_UP_DELTA` (default 15°) — looking up
- Iris horizontal offset beyond threshold (fine-grained gaze)

Calibration is **mandatory** before active monitoring. This prevents lecture attention thresholds from being applied in exam halls.

---

## ML pipeline

Modules under `ml/`:

| Module | Role |
|--------|------|
| `exam_gaze.py` | Calibrated paper-gaze evaluation |
| `exam_object_detector.py` | YOLOv8n — phone & book detection |
| `exam_hands.py` | Smartwatch heuristic (MediaPipe Hands) |
| `exam_violation_engine.py` | Sustain timers per `(exam_id, student_id, type)` |
| `exam_pipeline.py` | Per-frame orchestrator (no attendance/attention calls) |

System health (`GET /api/v1/system/health`) reports `exam_pipeline: ready|degraded|not_loaded`.

---

## API endpoints

| Method | Path | Permission |
|--------|------|------------|
| POST | `/exams` | `exam_sessions` |
| GET | `/exams` | `exam_violations_read` |
| GET | `/exams/{id}` | `exam_violations_read` |
| POST | `/exams/{id}/start` | `exam_sessions` |
| POST | `/exams/{id}/calibrate` | `exam_sessions` |
| PUT | `/exams/{id}/close` | `exam_sessions` |
| GET | `/exams/{id}/violations` | `exam_violations_read` |
| PUT | `/exams/{id}/violations/{vid}/review` | `exam_violations_review` |
| GET | `/exams/{id}/export/pdf` | `exam_reports_export` |
| GET | `/exams/dashboard` | `exam_violations_read` |
| WS | `/exams/{id}/monitor?token=` | `exam_monitor` |

---

## Frontend

| Route | Page | Permission |
|-------|------|------------|
| `/dashboard/exam-monitoring` | Live hall feed, calibration, violation feed | `exam_monitor` |
| `/dashboard/exam-review` | Violation table, lightbox, PDF export | `exam_violations_read` |

Dashboard home includes a separate **Exam Hall Monitoring** hero card (rose/slate gradient) with 7-day violation KPI from `GET /exams/dashboard`.

---

## Configuration

Environment variables (see `backend/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `EXAM_GAZE_YAW_THRESHOLD` | 28 | Max yaw deviation from baseline |
| `EXAM_GAZE_PITCH_UP_DELTA` | 15 | Pitch below baseline = looking up |
| `EXAM_PHONE_CONFIDENCE` | 0.55 | YOLO minimum confidence for phone |
| `EXAM_SNAPSHOT_RETENTION_DAYS` | 30 | Evidence retention policy |

---

## Privacy & retention

- Snapshots stored under `uploads/exam_violations/{exam_id}/`.
- Retention governed by `EXAM_SNAPSHOT_RETENTION_DAYS` (cleanup job can be scheduled separately).
- Review actions are written to the audit log (`exam_violation_review`).
- No automatic disciplinary action — human review required.

---

## RBAC

| Permission | Roles |
|------------|-------|
| `exam_sessions` | teacher, admin |
| `exam_monitor` | teacher, admin |
| `exam_violations_read` | teacher, admin, counselor |
| `exam_violations_review` | teacher, admin |
| `exam_reports_export` | teacher, admin |

---

## Not in v1

- Audio / Whisper proctoring
- Browser lockdown
- Custom smartwatch YOLO model
- Seat map / desk zones
- Redis-backed violation engine (multi-worker)

See `planning/` (local) for post-v1 enhancements.

---

## Testing

Backend tests in `backend/tests/`:

- `test_exam_sessions.py` — lifecycle, RBAC, dashboard KPIs
- `test_exam_violations.py` — sustain engine, review API
- `test_exam_gaze.py` — baseline and threshold unit tests
- `test_exam_ws.py` — WebSocket auth and payload shape

Run:

```bash
cd backend
pytest tests/test_exam_*.py -v
```
