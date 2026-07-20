# Oracle Cloud Always Free VM — Deployment Guide

Deploy the full AttendAI stack (React + FastAPI + PostgreSQL + ML) on Oracle Cloud for **$0/month** demo hosting.

> **Last updated:** 2026-06-21

---

## What you get

| Component | How it runs |
|-----------|-------------|
| Frontend | nginx container on port **80** |
| Backend API + WebSockets | FastAPI on port **8000** (proxied via nginx `/api/`) |
| Database | PostgreSQL 16 in Docker |
| ML | PyTorch, MediaPipe, YOLO inside backend container |

**Recommended VM shape:** Ampere A1 — **2 OCPU, 12 GB RAM** minimum (4 OCPU / 24 GB if available).

**HTTPS is required** for webcam access in the browser. Use **Cloudflare** (free) in front of the VM.

---

## Part 1 — Create the Oracle VM

### 1.1 Sign up

1. Go to [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)
2. Create an account (credit card may be required for verification; stay in Always Free resources to avoid charges)

### 1.2 Networking (VCN)

In the Oracle Console:

1. **Networking → Virtual Cloud Networks → Create VCN**
2. Use the wizard with defaults (public subnet)
3. Open **Security List → Ingress Rules** and add:

| Source | Protocol | Port | Notes |
|--------|----------|------|-------|
| `0.0.0.0/0` | TCP | 22 | SSH (restrict to your IP later if possible) |
| `0.0.0.0/0` | TCP | 80 | HTTP |
| `0.0.0.0/0` | TCP | 443 | HTTPS (optional if using Cloudflare → origin on 80 only) |

**Do not** expose PostgreSQL port 5432 to the internet.

### 1.3 Create the compute instance

1. **Compute → Instances → Create instance**
2. **Name:** `attendai-demo`
3. **Image:** Ubuntu 22.04 or 24.04 (aarch64)
4. **Shape:** Ampere → **`VM.Standard.A1.Flex`**
   - OCPUs: **2** (or 4)
   - Memory: **12 GB** (or 24 GB)
5. **Networking:** select your VCN + **public subnet**
6. **Assign public IPv4 address:** Yes
7. **SSH keys:** upload your public key (or save the generated private key)
8. Create

Note the **public IP address** (e.g. `150.136.x.x`).

### 1.4 Connect

```bash
ssh -i ~/.ssh/your_key ubuntu@YOUR_VM_PUBLIC_IP
```

---

## Part 2 — Install Docker and clone the project

On the VM:

```bash
# Option A — clone then bootstrap
git clone https://github.com/YOUR_USER/smart-attendance-system.git
cd smart-attendance-system
bash scripts/oracle_vm_bootstrap.sh

# Log out and back in so docker group applies
exit
ssh -i ~/.ssh/your_key ubuntu@YOUR_VM_PUBLIC_IP
cd smart-attendance-system
```

---

## Part 3 — Configure environment

```bash
cp infra/docker/.env.example infra/docker/.env
nano infra/docker/.env
```

Set at minimum:

```env
POSTGRES_PASSWORD=<strong-random-password>
SECRET_KEY=<64-char-hex-from-python-secrets>
ALLOWED_ORIGINS=https://attendai.yourdomain.com
FRONTEND_URL=https://attendai.yourdomain.com
```

Generate a secret key:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Pre-download ML models (recommended)

First Docker build is faster if models exist locally:

```bash
bash scripts/preload_ml_models.sh
```

If `ultralytics` is not installed on the VM yet, models will auto-download on first backend start inside Docker.

---

## Part 4 — Start the stack

```bash
cd ~/smart-attendance-system

docker compose -f infra/docker/docker-compose.yml \
  -f infra/docker/docker-compose.production.yml \
  --env-file infra/docker/.env up -d --build
```

Wait for build (10–20 minutes first time — PyTorch is large).

Run migrations and seed demo data:

```bash
docker compose -f infra/docker/docker-compose.yml \
  --env-file infra/docker/.env run --rm migrate

docker compose -f infra/docker/docker-compose.yml \
  --env-file infra/docker/.env exec \
  -e SEED_ADMIN=true backend python app/seed.py
```

Verify on the VM:

```bash
curl -s http://localhost/health          # frontend nginx
curl -s http://localhost:8000/health     # backend direct
```

From your browser (HTTP only, before HTTPS):

```
http://YOUR_VM_PUBLIC_IP
```

---

## Part 5 — HTTPS with Cloudflare (required for webcam)

Browsers block webcam unless the page is served over **HTTPS** (except `localhost`).

### 5.1 If you have a domain

1. Add the domain to [Cloudflare](https://dash.cloudflare.com) (free plan)
2. Create an **A record**: `attendai` → `YOUR_VM_PUBLIC_IP`
3. Enable **Proxy** (orange cloud)
4. SSL/TLS mode: **Flexible** (Cloudflare HTTPS → VM HTTP on port 80)
5. Update `infra/docker/.env`:

   ```env
   ALLOWED_ORIGINS=https://attendai.yourdomain.com
   FRONTEND_URL=https://attendai.yourdomain.com
   ```

6. Restart backend:

   ```bash
   docker compose -f infra/docker/docker-compose.yml \
     -f infra/docker/docker-compose.production.yml \
     --env-file infra/docker/.env up -d backend
   ```

7. Open `https://attendai.yourdomain.com`

### 5.2 No domain (Cloudflare Tunnel — free HTTPS URL)

1. Install `cloudflared` on the VM
2. Run `cloudflared tunnel --url http://localhost:80`
3. Use the generated `*.trycloudflare.com` URL
4. Set `ALLOWED_ORIGINS` and `FRONTEND_URL` to that HTTPS URL and restart backend

---

## Part 6 — Demo login

Seed creates an admin **only when** `SEED_ADMIN=true`:

```bash
docker compose -f infra/docker/docker-compose.yml \
  --env-file infra/docker/.env exec \
  -e SEED_ADMIN=true backend python app/seed.py
```

Default credentials (change immediately after first login):

- Email: `admin@school.edu`
- Password: `Admin@1234` (or `SEED_ADMIN_PASSWORD` env var)

---

## Operations

### View logs

```bash
docker compose -f infra/docker/docker-compose.yml logs -f backend
docker compose -f infra/docker/docker-compose.yml logs -f frontend
```

### Restart after code update

```bash
git pull
docker compose -f infra/docker/docker-compose.yml \
  -f infra/docker/docker-compose.production.yml \
  --env-file infra/docker/.env up -d --build
```

### Stop everything

```bash
docker compose -f infra/docker/docker-compose.yml down
```

### Backup database

```bash
docker compose -f infra/docker/docker-compose.yml exec db \
  pg_dump -U postgres smart_attendance_db > backup.sql
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build OOM / killed | Use 12 GB+ RAM shape; ensure `--workers 1` (production compose) |
| Webcam blocked | Must use HTTPS URL in browser |
| WebSocket failed | Check nginx `/api/` proxy; `ALLOWED_ORIGINS` must match frontend URL |
| 502 on `/api/` | Backend still starting — wait 2–3 min; check `docker logs sas-backend` |
| ML pipeline unavailable | First start downloads models — wait; check disk space (`df -h`) |
| CORS errors | `ALLOWED_ORIGINS` must exactly match browser URL (no trailing slash) |
| Cannot SSH | Oracle security list + Ubuntu ufw must allow port 22 |

### Check ML health (admin token)

```bash
curl -H "Authorization: Bearer <admin-jwt>" \
  https://attendai.yourdomain.com/api/v1/system/health
```

---

## Stay on Always Free (avoid charges)

- Use only **Ampere A1 Flex** in Always Free limits
- Do not create paid block volumes / load balancers unless you understand pricing
- Set billing alerts in Oracle Console
- One public IP + one VM is enough for demo

---

## Architecture diagram

```
Browser (HTTPS)
    │
    ▼
Cloudflare (TLS)
    │
    ▼
Oracle VM :80 ── nginx (frontend container)
    │              ├── /        → React SPA
    │              ├── /api/    → backend:8000 (REST + WebSocket)
    │              └── /uploads/ → backend:8000
    │
    └── backend:8000 ── FastAPI + ML (PyTorch, MediaPipe, YOLO)
              │
              └── db:5432 ── PostgreSQL
```

---

## Related files

| File | Purpose |
|------|---------|
| `infra/docker/docker-compose.yml` | Base stack |
| `infra/docker/docker-compose.production.yml` | Single worker + build args |
| `infra/docker/.env.example` | Production env template |
| `scripts/oracle_vm_bootstrap.sh` | VM initial setup |
| `scripts/preload_ml_models.sh` | Download ML weights before build |
