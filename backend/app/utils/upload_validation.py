"""
Upload validation utilities — WBS 15.3

Provides size and MIME-type checks for all file upload endpoints.
Call validate_upload() at the start of any route that accepts a file.
"""

from __future__ import annotations
from typing import Optional, Set

from fastapi import HTTPException, UploadFile

# ── Default limits ────────────────────────────────────────────────────────────
MAX_IMAGE_BYTES = 5 * 1024 * 1024      # 5 MB — face images
MAX_CSV_BYTES = 10 * 1024 * 1024       # 10 MB — SIS import
MAX_SQL_BYTES = 500 * 1024 * 1024      # 500 MB — DB restore

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_CSV_TYPES = {"text/csv", "text/plain", "application/csv",
                     "application/vnd.ms-excel"}
ALLOWED_SQL_TYPES = {"application/sql", "application/octet-stream",
                     "text/plain"}


async def validate_upload(
    file: UploadFile,
    *,
    max_bytes: int,
    allowed_types: Optional[Set[str]] = None,
    allowed_extensions: Optional[Set[str]] = None,
) -> bytes:
    """
    Read the file, validate its size and (optionally) content type / extension.
    Returns the raw bytes for further processing.
    Raises HTTPException 400/413 on failure.
    """
    raw = await file.read()

    # Size check
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {max_bytes // 1024 // 1024} MB.",
        )

    # Empty file check
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # MIME-type check
    if allowed_types and file.content_type:
        # Normalise: strip parameters (e.g. "text/csv; charset=utf-8")
        mime = file.content_type.split(";")[0].strip().lower()
        if mime not in {t.lower() for t in allowed_types}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{mime}'. Allowed: {sorted(allowed_types)}",
            )

    # Extension check (fallback when content_type is not trustworthy)
    if allowed_extensions and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in {e.lower().lstrip(".") for e in allowed_extensions}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension '.{ext}'. Allowed: {sorted(allowed_extensions)}",
            )

    return raw
