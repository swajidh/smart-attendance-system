Scripts
=======

This directory contains helper scripts for local demo operations.

## Canonical Demo Command Set (Phase 7 Frozen)

1. Start backend:
   - `./scripts/start_backend.ps1`
2. Start ML inference:
   - `./scripts/run_ml_demo.ps1`
3. Check attendance output:
   - `./scripts/run_demo_check.ps1`
4. Optional quick smoke check (without opening camera):
   - `./scripts/run_demo_smoke.ps1`

## Script Notes

- `start_backend.ps1` installs backend deps, runs migrations, then starts uvicorn.
- `run_ml_demo.ps1` installs ML deps, then starts webcam detection/recognition loop.
- `run_demo_check.ps1` fetches `GET /api/v1/attendance/today`.
- `run_demo_smoke.ps1` validates backend endpoints are reachable.

## Troubleshooting

- If camera does not open, ensure no other app is using the webcam.
- If attendance stays empty, verify known faces exist in `ml/src/config/known_faces.pkl`.
- If backend is unreachable, rerun `./scripts/start_backend.ps1` and check `/health`.

