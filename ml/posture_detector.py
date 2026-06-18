"""
Posture detector — classifies student posture from head-pose angles and
tracks whether a flagged posture is sustained beyond a threshold (30 s).

This module derives posture entirely from the yaw/pitch/roll output of
`head_pose.py` (no separate body-pose model is required), keeping inference
latency low while still detecting the most classroom-relevant postures.

Posture labels:
  "alert"     — head upright, facing forward
  "head_down" — chin tucked; pitch > 40° (looking down / likely sleeping)
  "looking_away" — strong horizontal rotation; |yaw| > 40°
  "tilted"    — significant head tilt; |roll| > 35°

Module-level state tracks *sustained* duration so we only flag after
the behaviour has been held for SUSTAIN_THRESHOLD seconds.
"""

from __future__ import annotations
import time
from typing import Optional

SUSTAIN_THRESHOLD = 30.0   # seconds before a non-alert posture is flagged
_HEAD_DOWN_PITCH = 40.0    # degrees below horizontal → head_down
_LOOK_AWAY_YAW = 40.0      # degrees horizontal rotation → looking_away
_TILT_ROLL = 35.0          # degrees roll → tilted

# ── Module-level state ────────────────────────────────────────────────────────
# Key: (session_id: str, student_id: str)
# Value: {"posture": str, "since": float}   (since = epoch time posture started)
_state: dict[tuple[str, str], dict] = {}


def classify_pose(pose: Optional[dict]) -> str:
    """
    Map a head-pose dict to a posture label.
    Returns 'alert' if pose is None (benefit of the doubt).
    """
    if pose is None:
        return "alert"

    pitch = pose.get("pitch", 0.0)
    yaw = abs(pose.get("yaw", 0.0))
    roll = abs(pose.get("roll", 0.0))

    if pitch > _HEAD_DOWN_PITCH:
        return "head_down"
    if yaw > _LOOK_AWAY_YAW:
        return "looking_away"
    if roll > _TILT_ROLL:
        return "tilted"
    return "alert"


def detect(
    session_id: str,
    student_id: str,
    pose: Optional[dict],
) -> dict:
    """
    Update posture state for a student and return:
        {
          "posture": str,          # current posture label
          "duration_seconds": int, # seconds held (0 if alert or < threshold)
          "flagged": bool,         # True only when sustained > SUSTAIN_THRESHOLD
        }
    """
    key = (session_id, student_id)
    current_posture = classify_pose(pose)
    now = time.time()

    if key not in _state:
        _state[key] = {"posture": current_posture, "since": now}
    else:
        if _state[key]["posture"] != current_posture:
            # Posture changed — reset timer
            _state[key] = {"posture": current_posture, "since": now}

    st = _state[key]
    duration = now - st["since"]
    flagged = (current_posture != "alert") and (duration >= SUSTAIN_THRESHOLD)

    return {
        "posture": current_posture,
        "duration_seconds": int(duration),
        "flagged": flagged,
    }


def clear_session(session_id: str) -> None:
    """Remove posture state for a closed session."""
    keys = [k for k in _state if k[0] == session_id]
    for k in keys:
        del _state[k]
