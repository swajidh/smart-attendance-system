# Scripts

Operational and development helper scripts for the Smart Attendance System.

> **Last updated:** 2026-06-18

## Available scripts

| Script | Platform | Purpose |
|--------|----------|---------|
| [`backup_db.py`](backup_db.py) | Cross-platform | `pg_dump` → gzip backup with retention policy |
| [`backup_db.ps1`](backup_db.ps1) | Windows | PowerShell wrapper for `backup_db.py` |
| [`collect_cctv_samples.py`](collect_cctv_samples.py) | Cross-platform | Capture labeled face samples from webcam, RTSP, or video file |
| [`collect_cctv_samples.ps1`](collect_cctv_samples.ps1) | Windows | PowerShell wrapper for sample collection |

## Database backup

```bash
# Requires pg_dump on PATH and DATABASE_URL or POSTGRES_* env vars
python scripts/backup_db.py --keep 7

# Windows
.\scripts\backup_db.ps1
```

Environment variables: `DATABASE_URL`, or `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. Optional `BACKUP_DIR`.

Alternatively, use the admin API: `POST /api/v1/system/backup`.

## CCTV sample collection

Collect training/validation face images for ML experiments:

```bash
python scripts/collect_cctv_samples.py --help
```

Supports webcam index, RTSP URL, or video file input with labeled output directories.

## Local development

No unified `start_dev` script — use Docker or run backend and frontend separately:

```bash
# From repo root
docker compose up --build

# Or manually
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
```

See [`../README.md`](../README.md) for full quick start.
