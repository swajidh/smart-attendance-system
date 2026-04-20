## Public routes (phase-0 prototype allowlist)

Per prototype requirements, these routes are intentionally public for local demo speed.
All other routes remain protected by default.

### `GET /health`
- Reason: liveness probe for local run verification.
- Owner to re-secure decision: backend lead.

### `GET /ready`
- Reason: readiness probe for dependency checks during demo.
- Owner to re-secure decision: backend lead.

### `POST /api/v1/register`
- Reason: allows baseline registration from local operator/ML setup workflow before auth is finalized.
- Owner to re-secure decision: backend lead.

### `POST /api/v1/mark-attendance`
- Reason: ML inference node must submit recognized attendance events in real time.
- Owner to re-secure decision: backend lead.

### `GET /api/v1/attendance/today`
- Reason: demo verification endpoint to confirm logs in real time.
- Owner to re-secure decision: backend lead.
