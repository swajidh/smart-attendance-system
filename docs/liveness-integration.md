# Liveness Integration Guide (Phase 5)

This project now includes a liveness hook point in the inference pipeline to support anti-spoof integration.

## Current behavior

- Feature flag: `--liveness-enabled` (default: disabled).
- Current checker: `NoOpLivenessChecker` (returns `allow`).
- Hook location: after recognition success and before attendance POST.

## Interface contract

Implemented in `ml/src/inference/liveness.py`.

- `check(frame, bbox, student_id) -> LivenessResult`
- `LivenessResult.decision`: `allow | deny | uncertain`
- `LivenessResult.reason`: machine-readable reason string

## Logging policy

- Liveness decisions are logged with:
  - timestamp
  - student_id
  - bounding box coordinates
  - decision
  - reason
- No frame/image bytes are logged.
- No PII image dumps are stored by this hook.

## How to replace with a real anti-spoof model

1. Create a new checker class implementing `LivenessChecker`.
2. Load your model once at startup.
3. In `check(...)`, return:
   - `allow` when confidence passes threshold
   - `deny` for spoof attempts
   - `uncertain` for low-confidence/ambiguous results
4. Wire the checker in `camera_loop.py` where `NoOpLivenessChecker` is currently instantiated.
5. Keep `--liveness-enabled` as the runtime gate for safe rollout.
