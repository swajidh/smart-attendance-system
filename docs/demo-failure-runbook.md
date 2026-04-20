# Demo Failure Runbook (Phase 7)

This runbook covers common live-demo failures and immediate recovery steps.

## 1) Camera Busy / Not Opening

Symptoms:
- `Could not open camera index ...`
- Black/blank webcam window

Actions:
1. Close apps that may hold camera (Teams, Zoom, browser tabs).
2. Retry ML script with alternate index:
   - `./scripts/run_ml_demo.ps1 -CameraIndex 1`
3. Confirm Windows privacy settings allow camera access.

## 2) YOLO Model Missing

Symptoms:
- Startup logs indicate YOLO model missing.
- Detector falls back to Haar mode.

Actions:
1. Place YOLO face weights at expected path (`yolov8n-face.pt`) or pass `--yolo-model`.
2. Continue demo with Haar fallback if acceptable for prototype.

## 3) Empty Known-Faces Index

Symptoms:
- `known_faces.pkl` missing or no recognition events.

Actions:
1. Ensure baseline photos exist under `data/uploads/baseline_photos/<student_id>/`.
2. Run encoder:
   - `ml/.venv/Scripts/python.exe ml/src/data/encode.py`
3. Re-run ML demo script.

## 4) Attendance Not Updating

Symptoms:
- `/api/v1/attendance/today` stays empty.

Actions:
1. Verify backend is running:
   - `./scripts/run_demo_smoke.ps1`
2. Reduce strictness if needed:
   - `./scripts/run_ml_demo.ps1 -SimilarityThreshold 0.55 -MinSimilarityGap 0.02`
3. Ensure recognized student exists in backend DB (`/api/v1/register`).

## 5) Fast Recovery Command Sequence

1. Stop existing backend/ML processes.
2. Start backend:
   - `./scripts/start_backend.ps1`
3. Validate:
   - `./scripts/run_demo_smoke.ps1`
4. Start ML:
   - `./scripts/run_ml_demo.ps1`
5. Verify attendance:
   - `./scripts/run_demo_check.ps1`
