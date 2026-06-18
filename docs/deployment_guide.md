# Deployment Guide — Smart Attendance System

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | ≥24.0 | Container runtime |
| Docker Compose | ≥2.20 | Multi-service orchestration |
| PostgreSQL | 16 (via Docker) | Primary database |
| Node.js | 20 (build only) | Frontend build |
| Python | 3.11 (build only) | Backend |

---

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/smart-attendance-system.git
cd smart-attendance-system

# 2. Copy environment file
cp backend/.env.example backend/.env
# Edit backend/.env — set SECRET_KEY, MAIL_* etc.

# 3. Start all services
docker compose up --build

# 4. Run database migrations (first time only)
docker compose exec backend alembic upgrade head

# 5. (Optional) Seed demo data
docker compose exec backend python app/seed.py
```

Services will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Production Deployment

### 1. Environment variables

Create a `.env` file in the project root (never commit it):

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=smart_attendance_db
SECRET_KEY=<64-char-random-string>
ALLOWED_ORIGINS=https://yourdomain.com
MAIL_SERVER=smtp.gmail.com
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=<app-password>
MAIL_FROM=noreply@yourdomain.com
```

Generate a strong secret key:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Build and start

```bash
docker compose -f infra/docker/docker-compose.yml up --build -d
```

### 3. Run migrations

```bash
docker compose -f infra/docker/docker-compose.yml run --rm migrate
```

### 4. Verify deployment

```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

---

## Database Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "describe_change"

# Rollback one step
alembic downgrade -1
```

---

## Backup & Restore

### Automated backup (via API)

```bash
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:8000/api/v1/system/backup \
     --output backup_$(date +%Y%m%d).sql
```

### Manual backup

```bash
# Using the provided script
scripts/backup_db.ps1       # Windows
python scripts/backup_db.py # Cross-platform
```

### Restore

```bash
# Via API
curl -X POST -H "Authorization: Bearer <admin-token>" \
     -F "file=@backup_20260101.sql" \
     http://localhost:8000/api/v1/system/restore
```

---

## HTTPS / TLS

For production, terminate TLS at the load balancer or use Certbot with nginx:

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

Alternatively, use Cloudflare or AWS ALB for TLS termination with the nginx container handling HTTP internally.

---

## Monitoring & Logs

```bash
# View backend logs
docker compose logs -f backend

# View all services
docker compose logs -f

# System health (requires admin token)
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/v1/system/health
```

---

## CI/CD

The repository includes `.github/workflows/ci.yml` which runs on every push to `main`/`develop`:

1. **Backend lint** (flake8 + black + isort)
2. **Backend tests** (pytest with Postgres service container)
3. **ML model integrity check** (imports + HEAD_POSE_READY flag)
4. **Frontend lint** (ESLint)
5. **Frontend tests** (Vitest)
6. **Docker build smoke test** (builds all images without pushing)
7. **Deploy** (SSH deploy on `main` push — requires `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` secrets)

---

## Rollback

If a deployment fails:

```bash
# SSH to server
git checkout <previous-tag>
docker compose -f infra/docker/docker-compose.yml up --build -d
alembic downgrade -1   # if migration was applied
```

---

## Scaling

- **Backend workers:** increase `--workers` in `CMD` of `Dockerfile.backend`
- **Database:** upgrade PostgreSQL to RDS or add PgBouncer for connection pooling
- **ML service:** split `Dockerfile.ml-service` to a GPU-enabled node if available
