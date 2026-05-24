# Public API routes

These endpoints do not require a Bearer token:

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/health` | Liveness + database check |
| POST | `/api/v1/auth/login` | Rate limited (5/min per IP) |
| POST | `/api/v1/auth/refresh` | Rate limited (5/min per IP) |

All other `/api/v1/*` routes require `Authorization: Bearer <access_token>`.
