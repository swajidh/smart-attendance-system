"""
System administration endpoints.
All routes restricted to admin role unless noted.

GET  /system/health          — CPU / RAM / disk / DB / ML status
POST /system/backup          — pg_dump downloadable SQL
POST /system/restore         — upload SQL → pg_restore
GET  /system/audit-log       — paginated immutable audit trail
POST /system/sis-import      — CSV student bulk-import with dedup
POST /system/email-summary   — trigger periodic attendance summary email
"""

from __future__ import annotations

import csv
import io
import os
import subprocess
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter, BackgroundTasks, Depends, File, HTTPException,
    Query, Response, UploadFile,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import (
    get_db_session, get_current_user, require_role, require_admin
)
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.models.student import Student
from app.config import settings

router = APIRouter(prefix="/system", tags=["system"])

_ADMIN = [Depends(require_admin)]


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", dependencies=_ADMIN)
async def system_health(db: AsyncSession = Depends(get_db_session)):
    """Return CPU/RAM/disk usage, DB connectivity, and ML model status."""
    health: dict = {"timestamp": datetime.now(timezone.utc).isoformat()}

    # --- System resources ---
    try:
        import psutil
        health["cpu_percent"] = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        health["ram_percent"] = mem.percent
        health["ram_used_mb"] = round(mem.used / 1024 / 1024, 1)
        health["ram_total_mb"] = round(mem.total / 1024 / 1024, 1)
        disk = psutil.disk_usage("/")
        health["disk_percent"] = disk.percent
        health["disk_used_gb"] = round(disk.used / 1024 ** 3, 1)
        health["disk_total_gb"] = round(disk.total / 1024 ** 3, 1)
        health["psutil_available"] = True
    except ImportError:
        health["psutil_available"] = False
        health["cpu_percent"] = None
        health["ram_percent"] = None
        health["disk_percent"] = None

    # --- DB connectivity ---
    try:
        await db.execute(select(func.now()))
        health["db_status"] = "ok"
    except Exception as e:
        health["db_status"] = f"error: {e}"

    # --- ML model status ---
    ml_status: dict = {}
    try:
        from ml.head_pose import HEAD_POSE_READY
        ml_status["head_pose"] = "ready" if HEAD_POSE_READY else "unavailable"
    except Exception:
        ml_status["head_pose"] = "not_loaded"

    try:
        from ml.face_encoder import ENCODER_READY, EMBEDDING_DIM
        if ENCODER_READY:
            ml_status["face_encoder"] = "ready"
            ml_status["face_encoder_dim"] = EMBEDDING_DIM
        else:
            ml_status["face_encoder"] = "not_loaded"
    except Exception as exc:
        ml_status["face_encoder"] = "not_loaded"
        ml_status["face_encoder_error"] = str(exc)

    health["ml"] = ml_status

    return health


# ── Backup / Restore ──────────────────────────────────────────────────────────

@router.post("/backup", dependencies=_ADMIN)
async def backup_database():
    """
    Run pg_dump and stream the resulting SQL as a download.
    Requires `pg_dump` on PATH and DATABASE_URL env var.
    """
    db_url = settings.DATABASE_URL
    # Parse connection info from URL
    # Expected format: postgresql+asyncpg://user:pass@host:port/dbname
    try:
        from urllib.parse import urlparse
        parsed = urlparse(db_url.replace("+asyncpg", ""))
        dbname = parsed.path.lstrip("/")
        user = parsed.username
        password = parsed.password
        host = parsed.hostname or "localhost"
        port = str(parsed.port or 5432)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not parse DATABASE_URL: {exc}")

    env = {**os.environ, "PGPASSWORD": password or ""}
    try:
        result = subprocess.run(
            ["pg_dump", "-h", host, "-p", port, "-U", user, "-d", dbname,
             "--no-password", "--format=plain"],
            capture_output=True, timeout=120, env=env,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="pg_dump not found. Ensure PostgreSQL client tools are installed.")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="pg_dump timed out")

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.decode()[:500])

    filename = f"backup_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.sql"
    return Response(
        content=result.stdout,
        media_type="application/sql",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/restore", dependencies=_ADMIN)
async def restore_database(file: UploadFile = File(...)):
    """
    Upload a plain SQL dump produced by /backup and execute it via psql.
    DANGEROUS — drops and recreates data. Admin-only.
    """
    if not file.filename.endswith(".sql"):
        raise HTTPException(status_code=400, detail="Only .sql files are accepted")

    sql_bytes = await file.read()

    db_url = settings.DATABASE_URL
    try:
        from urllib.parse import urlparse
        parsed = urlparse(db_url.replace("+asyncpg", ""))
        dbname = parsed.path.lstrip("/")
        user = parsed.username
        password = parsed.password
        host = parsed.hostname or "localhost"
        port = str(parsed.port or 5432)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not parse DATABASE_URL: {exc}")

    env = {**os.environ, "PGPASSWORD": password or ""}
    try:
        result = subprocess.run(
            ["psql", "-h", host, "-p", port, "-U", user, "-d", dbname, "--no-password"],
            input=sql_bytes, capture_output=True, timeout=300, env=env,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="psql not found.")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Restore timed out")

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.decode()[:500])

    return {"message": "Database restored successfully"}


# ── Audit log ─────────────────────────────────────────────────────────────────

@router.get("/audit-log", dependencies=_ADMIN)
async def get_audit_log(
    user_id: Optional[UUID] = Query(None),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    from app.models.user import User as UserModel
    q = (
        select(AuditLog, UserModel)
        .outerjoin(UserModel, AuditLog.user_id == UserModel.id)
    )
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    if entity_type:
        q = q.where(AuditLog.entity_type.ilike(f"%{entity_type}%"))
    if action:
        q = q.where(AuditLog.action.ilike(f"%{action}%"))
    if start_date:
        q = q.where(AuditLog.timestamp >= start_date)
    if end_date:
        q = q.where(AuditLog.timestamp <= end_date)
    q = q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)

    rows = (await db.execute(q)).all()
    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "user_email": user.email if user else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat(),
        }
        for log, user in rows
    ]


# ── SIS (Student Information System) import ───────────────────────────────────

_REQUIRED_COLS = {"name", "email", "roll_no"}
_OPTIONAL_COLS = {"department", "phone"}


@router.post("/sis-import", dependencies=_ADMIN)
async def sis_import(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Bulk-import students from a CSV file.
    Required columns: name, email, roll_no
    Optional columns: department, phone

    Duplicate detection: skip rows where roll_no OR email already exists.
    Returns: {imported, duplicates_resolved, errors}
    """
    from app.utils.upload_validation import validate_upload, MAX_CSV_BYTES, ALLOWED_CSV_TYPES
    raw = await validate_upload(
        file,
        max_bytes=MAX_CSV_BYTES,
        allowed_extensions={"csv"},
    )
    try:
        text = raw.decode("utf-8-sig")   # handle BOM
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV has no headers")

    headers = {h.strip().lower() for h in reader.fieldnames}
    missing = _REQUIRED_COLS - headers
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {missing}. Got: {headers}"
        )

    # Load existing roll_no + email sets for fast dedup
    existing_rolls = set(
        r for (r,) in (await db.execute(select(Student.roll_no))).all() if r
    )
    existing_emails = set(
        e for (e,) in (await db.execute(select(Student.email))).all() if e
    )

    imported = 0
    duplicates = 0
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):
        name = row.get("name", "").strip()
        email = row.get("email", "").strip().lower()
        roll_no = row.get("roll_no", "").strip().upper()
        department = row.get("department", "").strip() or None
        phone = row.get("phone", "").strip() or None

        if not name or not email or not roll_no:
            errors.append(f"Row {i}: missing required field (name/email/roll_no)")
            continue

        if roll_no in existing_rolls or email in existing_emails:
            duplicates += 1
            continue

        student = Student(
            id=uuid.uuid4(),
            name=name,
            email=email,
            roll_no=roll_no,
            department=department,
            phone=phone,
            is_active=True,
        )
        db.add(student)
        existing_rolls.add(roll_no)
        existing_emails.add(email)
        imported += 1

    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error during import: {exc}")

    return {
        "imported": imported,
        "duplicates_resolved": duplicates,
        "errors": errors,
        "total_rows_processed": imported + duplicates + len(errors),
    }


# ── Periodic email summary ─────────────────────────────────────────────────────

_summary_config: dict = {"enabled": False, "frequency": "weekly", "last_run": None}


@router.post("/email-summary/configure", dependencies=_ADMIN)
async def configure_email_summary(
    enabled: bool = Query(False),
    frequency: str = Query("weekly"),
):
    _summary_config.update({"enabled": enabled, "frequency": frequency})
    return _summary_config


@router.post("/email-summary/trigger", dependencies=_ADMIN)
async def trigger_email_summary(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session),
):
    """Manually trigger a summary email for all teachers. Runs in background."""
    background_tasks.add_task(_send_summary_emails, db)
    _summary_config["last_run"] = datetime.now(timezone.utc).isoformat()
    return {"message": "Summary email task queued", "config": _summary_config}


async def _send_summary_emails(db: AsyncSession):
    """Background task: send attendance summary to all teachers."""
    try:
        from app.services.report_service import get_dashboard_summary
        summary = await get_dashboard_summary(db)

        from app.models.user import User as UserModel
        teachers_res = await db.execute(
            select(UserModel).where(UserModel.role == UserRole.teacher, UserModel.is_active == True)
        )
        teachers = teachers_res.scalars().all()

        # Try email sending (graceful degradation if mail not configured)
        try:
            from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
            conf = ConnectionConfig(
                MAIL_USERNAME=settings.MAIL_USERNAME,
                MAIL_PASSWORD=settings.MAIL_PASSWORD,
                MAIL_FROM=settings.MAIL_FROM,
                MAIL_PORT=settings.MAIL_PORT,
                MAIL_SERVER=settings.MAIL_SERVER,
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True,
            )
            fm = FastMail(conf)
            body = (
                f"<h2>Smart Attendance Summary</h2>"
                f"<p>Total Students: {summary.get('total_students', 0)}</p>"
                f"<p>Total Courses: {summary.get('total_courses', 0)}</p>"
                f"<p>Avg Attendance: {summary.get('avg_attendance', 0):.1f}%</p>"
                f"<p>Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>"
            )
            for teacher in teachers:
                msg = MessageSchema(
                    subject="Smart Attendance Weekly Summary",
                    recipients=[teacher.email],
                    body=body,
                    subtype="html",
                )
                await fm.send_message(msg)
        except Exception:
            pass  # Mail not configured — silently skip
    except Exception:
        pass
