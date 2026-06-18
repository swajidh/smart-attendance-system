#!/usr/bin/env python3
"""
backup_db.py — Database backup utility for Smart Attendance System
WBS 16.4

Usage:
    python scripts/backup_db.py [--output-dir ./backups] [--keep 7]

Environment variables (or loaded from backend/.env):
    DATABASE_URL  — PostgreSQL connection string
    POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB
    BACKUP_DIR    — override output directory (optional)

Features:
    - Calls pg_dump via subprocess to produce a plain-SQL backup
    - Compresses with gzip
    - Retains the most recent N backups (configurable via --keep)
    - Prints a summary line with backup size and path
    - Exit code 0 on success, non-zero on failure
"""

from __future__ import annotations

import argparse
import gzip
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


def parse_db_url(url: str) -> dict:
    """Extract connection params from a postgresql+asyncpg:// or postgresql:// URL."""
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    p = urlparse(url)
    return {
        "host": p.hostname or "localhost",
        "port": str(p.port or 5432),
        "user": p.username or "postgres",
        "password": p.password or "",
        "dbname": p.path.lstrip("/"),
    }


def find_pg_dump() -> str:
    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        raise RuntimeError(
            "pg_dump not found. Install PostgreSQL client tools or run:\n"
            "  Windows: choco install postgresql\n"
            "  Ubuntu:  apt-get install postgresql-client"
        )
    return pg_dump


def load_env_from_file() -> dict:
    """Load .env from backend/.env if DATABASE_URL is not set in environment."""
    env_file = Path(__file__).parent.parent / "backend" / ".env"
    if not env_file.exists():
        return {}
    result = {}
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            result[k.strip()] = v.strip().strip('"').strip("'")
    return result


def run_backup(output_dir: Path, keep: int) -> None:
    # Load env
    env_vars = load_env_from_file()
    db_url = (
        os.environ.get("DATABASE_URL")
        or env_vars.get("DATABASE_URL")
        or "postgresql+asyncpg://postgres:password@localhost:5432/smart_attendance_db"
    )
    params = parse_db_url(db_url)

    pg_dump = find_pg_dump()

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_sql = output_dir / f"sas_backup_{timestamp}.sql"
    backup_gz  = output_dir / f"sas_backup_{timestamp}.sql.gz"

    env = os.environ.copy()
    env["PGPASSWORD"] = params["password"]

    cmd = [
        pg_dump,
        "-h", params["host"],
        "-p", params["port"],
        "-U", params["user"],
        "-d", params["dbname"],
        "--no-password",
        "--format=plain",
        "--verbose",
        "-f", str(backup_sql),
    ]

    print(f"[backup_db] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[backup_db] ERROR: pg_dump failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    # Compress
    with open(backup_sql, "rb") as f_in, gzip.open(backup_gz, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    backup_sql.unlink()

    size_mb = backup_gz.stat().st_size / (1024 * 1024)
    print(f"[backup_db] Backup written: {backup_gz} ({size_mb:.2f} MB)")

    # Retention: remove older backups
    all_backups = sorted(output_dir.glob("sas_backup_*.sql.gz"))
    while len(all_backups) > keep:
        oldest = all_backups.pop(0)
        oldest.unlink()
        print(f"[backup_db] Removed old backup: {oldest.name}")

    print(f"[backup_db] Done. Retained {min(len(all_backups), keep)} backup(s).")


def main():
    parser = argparse.ArgumentParser(description="Smart Attendance System — DB backup")
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).parent.parent / "backups"),
        help="Directory to write backup files (default: ./backups)",
    )
    parser.add_argument(
        "--keep",
        type=int,
        default=7,
        help="Number of recent backups to retain (default: 7)",
    )
    args = parser.parse_args()
    run_backup(Path(args.output_dir), args.keep)


if __name__ == "__main__":
    main()
