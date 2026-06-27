# Infrastructure

Deployment configuration for the Smart Attendance System.

> **Last updated:** 2026-06-18

## Layout

```
infra/
└── docker/
    ├── docker-compose.yml      Production compose (Postgres + backend + frontend/nginx)
    ├── Dockerfile.backend      Multi-stage production backend
    ├── Dockerfile.frontend     Node build → nginx 1.27
    ├── Dockerfile.ml-service   Standalone ML service (optional, not in main compose)
    └── nginx.conf              SPA routing + API reverse proxy
```

CI/CD workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (at repo root, not under `infra/`).

## Local development

Use the **root** [`docker-compose.yml`](../docker-compose.yml):

```bash
docker compose up --build
```

Services: `db`, `migrate`, `backend`, `frontend` (Vite dev server).

## Production deployment

```bash
cp backend/.env.example backend/.env   # configure secrets
docker compose -f infra/docker/docker-compose.yml up --build -d
```

Configure via environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `POSTGRES_USER` | postgres | Database user |
| `POSTGRES_PASSWORD` | — | Database password |
| `POSTGRES_DB` | smart_attendance_db | Database name |
| `SECRET_KEY` | — | JWT secret |
| `ALLOWED_ORIGINS` | — | CORS origins |
| `BACKEND_PORT` | 8000 | Backend host port |
| `FRONTEND_PORT` | 80 | Frontend/nginx host port |
| `DB_PORT` | 5432 | Postgres host port |

Migrations run via the `migrate` service before backend starts.

## nginx

`nginx.conf` serves the React SPA and proxies `/api` and WebSocket paths to the backend container.

## CI/CD deploy

On push to `main`, the GitHub Actions `deploy` job SSHs to the production server and runs:

```bash
git pull origin main
docker compose -f infra/docker/docker-compose.yml up -d --build
```

Requires secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

See [`docs/deployment_guide.md`](../docs/deployment_guide.md) for full instructions.

## Future

- `infra/k8s/` — Kubernetes manifests (not yet implemented)
- `infra/monitoring/` — Observability stack (not yet implemented)
