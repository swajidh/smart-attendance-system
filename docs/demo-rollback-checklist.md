# Demo Rollback Checklist (Failure Recovery)

Use this when the live demo path fails and fast recovery is needed.

---

## 1) Immediate Stabilization

- [ ] Stop ML inference process cleanly.
- [ ] Stop backend process cleanly.
- [ ] Confirm no stale process is holding the camera device.

## 2) Minimal Health Recovery

- [ ] Start backend only and verify `/health`.
- [ ] Verify DB file/path is reachable.
- [ ] Re-run migration step if schema mismatch is suspected.

## 3) Inference Recovery

- [ ] Validate `known_faces` artifact exists and is readable.
- [ ] Restart ML script with baseline-safe thresholds.
- [ ] Verify camera feed opens and detections are visible.

## 4) Fallback Demo Mode

- [ ] If recognition confidence is unstable, switch to conservative threshold profile.
- [ ] If detector weights unavailable, run documented fallback detector mode.
- [ ] Revalidate by checking `attendance/today`.

## 5) Post-Recovery Verification

- [ ] Known face recognized and logged.
- [ ] Unknown face does not log attendance.
- [ ] Duplicate prevention still works.
- [ ] Record issue and final parameters used for the run.
