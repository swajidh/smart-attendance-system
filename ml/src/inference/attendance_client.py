from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any


class AttendanceClient:
    def __init__(self, *, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url
        self._timeout_seconds = timeout_seconds

    def post_mark_attendance(self, *, student_id: str, marked_at: datetime) -> dict[str, Any] | None:
        payload = {"student_id": student_id, "marked_at": marked_at.isoformat()}
        req = urllib.request.Request(
            self._base_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout_seconds) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body) if body else None
        except urllib.error.HTTPError as exc:
            details = ""
            try:
                details = exc.read().decode("utf-8")
            except Exception:
                details = ""
            print(f"Attendance API HTTP error: {exc.code} {details}", flush=True)
            return None
        except Exception as exc:
            print(f"Attendance API request failed: {exc}", flush=True)
            return None
