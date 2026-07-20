"""
Exam violation sustain engine — fires events only after sustained signals.
"""

from __future__ import annotations

import time
from typing import Optional

DEFAULT_SUSTAIN = {
    "gaze_away": 4.0,
    "phone_detected": 1.0,
    "unauthorized_object": 2.0,
    "smartwatch_suspected": 5.0,
}

CLEAR_RESET_SEC = 2.0
OBJECT_CLEAR_RESET_SEC = 4.5
OBJECT_VIOLATION_TYPES = frozenset(
    {"phone_detected", "unauthorized_object", "smartwatch_suspected"}
)

_state: dict[tuple[str, str, str], dict] = {}


def update(
    exam_id: str,
    student_id: str,
    violation_type: str,
    active: bool,
    sustain_sec: Optional[float] = None,
) -> Optional[dict]:
    """
    Update sustain tracker. Returns event dict when threshold met (once per cycle).
    student_id may be 'unknown' for unrecognized faces.
    """
    key = (exam_id, student_id, violation_type)
    threshold = sustain_sec or DEFAULT_SUSTAIN.get(violation_type, 3.0)
    now = time.time()

    reset_after = (
        OBJECT_CLEAR_RESET_SEC
        if violation_type in OBJECT_VIOLATION_TYPES
        else CLEAR_RESET_SEC
    )

    if not active:
        if key in _state:
            st = _state[key]
            if now - st.get("last_active", now) >= reset_after:
                del _state[key]
        return None

    if key not in _state:
        _state[key] = {"since": now, "last_active": now, "fired": False}
    else:
        _state[key]["last_active"] = now

    st = _state[key]
    duration = now - st["since"]
    if duration >= threshold and not st["fired"]:
        st["fired"] = True
        return {
            "violation_type": violation_type,
            "student_id": student_id,
            "sustained_seconds": round(duration, 1),
        }
    return None


def reset_cycle(exam_id: str, student_id: str, violation_type: str) -> None:
    key = (exam_id, student_id, violation_type)
    _state.pop(key, None)


def sync_active(exam_id: str, violation_type: str, active_student_ids: set[str]) -> None:
    """On a detection frame, clear sustain for IDs no longer seeing the signal."""
    for key in list(_state):
        if key[0] == exam_id and key[2] == violation_type and key[1] not in active_student_ids:
            update(exam_id, key[1], violation_type, False)


def clear_exam(exam_id: str) -> None:
    keys = [k for k in _state if k[0] == exam_id]
    for k in keys:
        del _state[k]
