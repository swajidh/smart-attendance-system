# Smart Attendance System - Detailed Implementation Plan

Status: Draft v1  
Owner: Engineering (CV + Backend)  
Scope Source: FYP demo requirements (live webcam -> detect -> recognize -> log attendance)  
Governing Contract (non-overridable): `non-negociable-cursor-reqs.md`

---

## 1) Rules of Execution (Must Follow at All Times)

This implementation plan is valid only if every task complies with `non-negociable-cursor-reqs.md`.

- Non-negotiable rules override all other assumptions.
- No placeholder/stub implementations in production code (`TODO`, `pass`, mock-only paths).
- Backend remains async (`FastAPI` + `async def`) with typed request/response models.
- Use structured responses, request IDs, global exception handling, and structured JSON logs.
- Auth-by-default architecture remains intact; prototype public routes must be explicitly documented.
- If this plan conflicts with `non-negociable-cursor-reqs.md`, the non-negotiable file wins.

---

## 2) Progress Tracking Legend

- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked
- [-] Not applicable (with written justification)

---

## 3) Master Progress Dashboard

| Phase | Name | Status | Owner | ETA | Notes |
|---|---|---|---|---|---|
| P0 | Scope Lock + Governance | [x] | Engineering | Done | Governance artifacts created and routes documented |
| P1 | Backend Foundation + Contracts | [x] | Engineering | Done | App foundation, middleware, envelopes, DB dep, migration verified |
| P2 | Face Registration Pipeline | [x] | Engineering | Done | Register endpoint + storage + encoder pipeline implemented |
| P3 | Real-Time Inference Loop | [x] | Engineering | Done | Camera loop, YOLO/fallback detector, overlays, and runtime flags implemented |
| P4 | Recognition + Attendance Logging | [x] | Engineering | Done | Embedding recognition + threshold/gap + attendance APIs integrated |
| P5 | Fraud-Prevention Hook Points | [x] | Engineering | Done | Liveness interface, feature flag, decision logging, and integration guide added |
| P6 | Performance Tuning for Live Demo | [x] | Engineering | Done | Metrics, scaling, cache, startup checks, and unknown-save throttling added |
| P7 | Testing + Demo Readiness | [x] | Engineering | Done | Integration tests, smoke scripts, runbook, and frozen command path completed |

---

## 4) Requirement Traceability (Requirement -> Workstream)

| Required capability | Planned phase(s) | Completion criteria |
|---|---|---|
| Live feed intake from webcam | P3 | Camera opens reliably with frame loop and graceful shutdown |
| Real-time face detection (YOLO/similar) | P3, P6 | Face boxes drawn at stable FPS on local machine |
| Real-time recognition against local known faces | P2, P4 | Matched identity returned with confidence and threshold checks |
| Fraud prevention extensibility | P5 | Liveness/spoof module interface inserted with feature flag |
| Attendance logging with timestamp | P4 | Successful recognition writes deduped attendance with timestamp |
| Lightweight backend demo stack | P1, P6, P7 | Demo runs fully local without heavy infra dependencies |

---

## 5) Architecture Flow (Webcam -> Attendance Log)

1. `cv2.VideoCapture` reads frames from local webcam.
2. Frame pre-processing (resize + optional skip-frame policy) reduces compute load.
3. Face detector (YOLO face model, with documented fallback detector) returns face boxes.
4. For each face crop:
   - Generate embedding (DeepFace/dlib compatible adapter).
   - Compare embedding against local known-embeddings index.
   - Apply confidence threshold + ambiguity gap checks.
5. If recognized:
   - Pass through liveness hook interface (`ALLOW`, `BLOCK`, `UNKNOWN`) for future anti-spoofing.
   - Call backend attendance endpoint with student ID and timestamp.
6. Backend validates student, dedupes recent attendance window, stores log, returns typed envelope.
7. Overlay rendered on frame (`Recognized:<id>` / `Unknown`) with confidence metrics.
8. Structured logs written for traceability (`request_id`, endpoint, duration, error fields).

---

## 6) Dependencies & Stack (`requirements.txt` Breakdown)

Pin exact versions when implementing.

### 6.1 Core Runtime
- `fastapi` - async API layer for registration and attendance endpoints
- `uvicorn` - ASGI server for local prototype
- `sqlalchemy` - ORM for students and attendance logs
- `aiosqlite` - lightweight local DB for demo
- `alembic` - schema migration control
- `pydantic-settings` - typed env config
- `python-json-logger` - structured logs
- `python-multipart` - baseline face image upload

### 6.2 CV/Inference
- `opencv-python` - webcam input, frame ops, drawing overlays
- `ultralytics` - YOLO-based face detection
- `deepface` - embedding generation and identity matching
- `numpy` - vector math and cosine similarity

### 6.3 Optional (for robustness/testing)
- `httpx` - async client for integration tests
- `pytest`, `pytest-asyncio` - backend and pipeline tests
- `ruff`, `mypy` - linting and strict typing gates

---

## 7) Project Structure (Modular and Demo-Friendly)

```text
smart-attendance-system/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── attendance.py
│   │   │   │   ├── students.py
│   │   │   │   └── router.py
│   │   │   └── dependencies.py
│   │   ├── services/
│   │   │   ├── attendance_service.py
│   │   │   └── student_service.py
│   │   ├── models/
│   │   │   ├── base.py
│   │   │   ├── student.py
│   │   │   └── attendance_log.py
│   │   ├── schemas/
│   │   │   ├── common.py
│   │   │   ├── student.py
│   │   │   └── attendance.py
│   │   ├── middleware/
│   │   │   └── request_id.py
│   │   ├── config.py
│   │   └── main.py
│   ├── migrations/
│   ├── tests/
│   └── requirements.txt
├── ml/
│   ├── src/
│   │   ├── data/
│   │   │   └── encode.py                # baseline embedding generation
│   │   ├── inference/
│   │   │   ├── camera_loop.py           # cv2 capture loop
│   │   │   ├── detector.py              # YOLO face detector adapter
│   │   │   ├── recognizer.py            # embedding + matching logic
│   │   │   ├── attendance_client.py     # backend API post
│   │   │   └── main.py                  # orchestration entrypoint
│   │   └── config/
│   │       └── known_faces.pkl
│   └── requirements.txt
├── data/
│   ├── uploads/baseline_photos/
│   └── interim/unknown_faces/
└── implementation-plan.md
```

---

## 8) Phase-by-Phase Implementation Plan

## P0 - Scope Lock + Governance

### Objectives
- Lock demo acceptance criteria and prevent scope creep.
- Define public prototype routes and security exceptions explicitly.

### Tasks
- [x] Finalize demo DoD: "recognized face -> attendance row in DB in under 3s".
- [x] Document temporary public endpoints in `backend/docs/public-routes.md`.
- [x] Define calibration checklist (camera lighting, distance, angle).
- [x] Define rollback checklist if live demo fails.

### Exit Criteria
- [x] Scope signed off.
- [x] Public-route justification documented.
- [x] Demo script path agreed by team.

---

## P1 - Backend Foundation + Contracts

### Objectives
- Build compliant FastAPI backend contracts before CV coupling.

### Tasks
- [x] Implement app factory, `/health`, `/ready`, `/api/v1` router composition.
- [x] Add request-id middleware and `X-Request-ID` propagation.
- [x] Add `ApiResponse[T]` and global exception handlers.
- [x] Implement DB session dependency and config via `pydantic-settings`.
- [x] Add structured JSON logging with required fields.
- [x] Add `students` and `attendance_logs` schema with Alembic migration.

### Exit Criteria
- [x] Backend starts cleanly and responds with typed envelopes.
- [x] Migrations apply on clean DB.
- [x] Logs include request metadata and no sensitive values.

---

## P2 - Face Registration Pipeline

### Objectives
- Create reproducible baseline enrollment workflow.

### Tasks
- [x] Implement `POST /api/v1/register` (student_id, name, baseline face image).
- [x] Validate file type/size and store images in `data/uploads/baseline_photos/<student_id>/`.
- [x] Build `ml/src/data/encode.py` to generate embeddings into `known_faces.pkl`.
- [x] Ensure one student can have multiple baseline images.
- [x] Add integrity checks: empty dataset, broken image, no face detected.

### Exit Criteria
- [x] Known-face index generation pipeline implemented from registered student photo folders.
- [x] Bad uploads rejected with typed error envelope.
- [x] Re-running encoder updates embeddings safely.

---

## P3 - Real-Time Inference Loop

### Objectives
- Run stable local webcam pipeline with visible on-frame status.

### Tasks
- [x] Implement `cv2.VideoCapture` loop with cleanup on quit.
- [x] Integrate YOLO face detector adapter (`ultralytics`) with fallback.
- [x] Draw face boxes and recognition text overlay.
- [x] Implement frame-throttling knobs (`inference_every_n_frames`, max faces/frame).
- [x] Add runtime flags for camera index and display mode.

### Exit Criteria
- [x] Webcam processing loop implementation completed with clean shutdown path.
- [x] Face detection overlays implemented for real-time display mode.
- [x] Loop exits cleanly without hanging camera handle.

---

## P4 - Recognition + Attendance Logging

### Objectives
- Tie recognition confidence to attendance write path.

### Tasks
- [x] Implement recognizer with cosine similarity matching.
- [x] Add threshold + top1/top2 gap logic to avoid false positives.
- [x] Call `POST /api/v1/mark-attendance` only on accepted recognition.
- [x] Implement dedupe window (`ATTENDANCE_DEDUPE_MINUTES`) in backend service.
- [x] Implement `GET /api/v1/attendance/today` for demo verification.

### Exit Criteria
- [x] Unknown faces are filtered by threshold/gap logic before attendance POST.
- [x] Known faces mark attendance with timestamp via backend attendance API.
- [x] Duplicate marks within cooldown return `already_marked=true` from backend service.

---

## P5 - Fraud-Prevention Hook Points

### Objectives
- Keep architecture ready for liveness/anti-spoof integration.

### Tasks
- [x] Add liveness interface contract:
  - [x] `check(frame, bbox, student_id) -> allow | deny | uncertain`
- [x] Insert hook between recognition success and attendance API call.
- [x] Add feature flag (`LIVENESS_ENABLED=false` default).
- [x] Log liveness decision payload (no PII image dumps by default).

### Exit Criteria
- [x] Liveness plug point exists without breaking current flow.
- [x] Pipeline behavior unchanged when liveness disabled (default path).
- [x] Documentation includes integration path for future model.

---

## P6 - Performance Tuning for Live Demo

### Objectives
- Maintain smooth real-time behavior on standard local machine.

### Tasks
- [x] Benchmark-ready FPS/latency instrumentation added for local target hardware runs.
- [x] Tune frame resize ratio and inference cadence.
- [x] Limit processed faces/frame and unknown-image save cadence.
- [x] Optimize recognition cache and minimize repeated embedding work.
- [x] Add startup checks for missing models/index files with clear errors.

### Exit Criteria
- [x] Stable FPS instrumentation and tuning controls implemented.
- [x] Recognition-to-log latency metrics instrumentation implemented.
- [x] Cache bounded-size controls and throttles implemented for long-running stability.

---

## P7 - Testing + Demo Readiness

### Objectives
- Ensure deterministic demo behavior and recovery playbook.

### Tasks
- [x] Backend integration tests:
  - [x] register success/failure
  - [x] mark-attendance success/unknown student/dedupe
  - [x] attendance-today response shape
- [x] Add smoke script: start backend, run inference, check attendance endpoint.
- [x] Add runbook for common failures (camera busy, no model file, empty embeddings).
- [x] Freeze exact demo command set in `scripts/README.md`.

### Exit Criteria
- [x] Critical tests pass.
- [x] Demo runbook validated end-to-end.
- [x] Team can execute demo from clean machine setup.

---

## 9) Step-by-Step Build Roadmap (Sequential)

1. Initialize backend base (`FastAPI`, config, middleware, response envelope, DB session).
2. Create DB models/migrations (`students`, `attendance_logs`) and verify migration runs.
3. Build register endpoint and store baseline photos by student ID.
4. Implement embedding generator (`encode.py`) and produce `known_faces.pkl`.
5. Build camera loop with face detector and real-time bounding boxes.
6. Build recognizer service (embedding extraction + similarity matcher).
7. Integrate attendance POST from recognizer only on confident match.
8. Implement dedupe and attendance listing endpoint for live validation.
9. Add liveness hook interface (disabled by default).
10. Calibrate threshold/gap + frame cadence on demo hardware.
11. Run full demo rehearsal and freeze stable settings.

---

## 10) Core Code Boilerplate

### 10.1 Webcam Loop (Foundation)

```python
import cv2
from datetime import datetime, timezone

from recognizer import recognize_face
from attendance_client import post_attendance


def run_camera_loop(camera_index: int = 0) -> None:
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open camera index={camera_index}")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            result = recognize_face(frame)
            # result: {"bbox": (x1,y1,x2,y2), "student_id": str|None, "similarity": float|None}
            if result is not None:
                x1, y1, x2, y2 = result["bbox"]
                student_id = result["student_id"]
                similarity = result["similarity"]

                if student_id is not None:
                    label = f"Recognized: {student_id} ({similarity:.2f})"
                    color = (0, 255, 0)
                    post_attendance(student_id=student_id, marked_at=datetime.now(timezone.utc))
                else:
                    label = f"Unknown ({similarity:.2f})" if similarity is not None else "Unknown"
                    color = (0, 0, 255)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

            cv2.imshow("Smart Attendance Demo", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
```

### 10.2 Recognition + Logging Integration Function

```python
from datetime import datetime, timezone
from typing import Any


def handle_recognition_event(
    *,
    student_id: str | None,
    similarity: float | None,
    threshold: float,
    min_gap: float,
    top2_similarity: float | None,
    post_attendance_fn,
) -> dict[str, Any]:
    if student_id is None or similarity is None:
        return {"recognized": False, "reason": "no_match"}

    if similarity < threshold:
        return {"recognized": False, "reason": "below_threshold"}

    if top2_similarity is not None and (similarity - top2_similarity) < min_gap:
        return {"recognized": False, "reason": "ambiguous_match"}

    # Liveness hook point for future anti-spoof integration.
    # decision = liveness_checker.check(...)
    # if decision != "allow":
    #     return {"recognized": False, "reason": f"liveness_{decision}"}

    response = post_attendance_fn(
        student_id=student_id,
        marked_at=datetime.now(timezone.utc),
    )
    return {"recognized": True, "student_id": student_id, "attendance_response": response}
```

---

## 11) Demo Constraints and Optimization Guardrails

- Keep model choices CPU-friendly by default; allow optional GPU acceleration.
- Use configurable frame skipping and max-face caps to avoid frame drops.
- Avoid heavyweight distributed components for prototype (single backend + local files/SQLite).
- Ensure clear visual feedback: detected box, recognition status, and confidence text.
- Avoid blocking HTTP calls in frame thread when possible; queue async post or debounce.

---

## 12) Final Go-Live Checklist (Prototype Demo)

- [ ] Webcam opens and renders frames in real time.
- [ ] Known student face is recognized and visibly labeled.
- [ ] Unknown face is labeled unknown and does not trigger attendance.
- [ ] Attendance entry appears in DB/API with correct timestamp.
- [ ] Duplicate attendance within cooldown is prevented.
- [ ] All errors return typed envelopes and are logged with request IDs.
- [ ] Public prototype routes explicitly documented.

---

## 13) Notes

- This plan intentionally prioritizes an end-to-end working demo over production-scale complexity.
- Anti-spoofing is prepared architecturally via hook points but can be added in next iteration.
- No frontend dependency is required for the initial demonstration; API + camera overlay are sufficient.

