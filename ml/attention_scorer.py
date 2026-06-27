"""
Attention scorer — converts head-pose angles into a 0–100 attention score
and maintains per-student smoothed state across frames.

Scoring rules (yaw = horizontal, pitch = vertical):
  Forward (|yaw| <15° AND |pitch| <15°) → 80–100  (attentive)
  Slight deviation (15–30°)             → 50–80   (slightly distracted)
  Major deviation  (30–45°)             → 20–50   (distracted)
  Head down / away (>45°)              → 0–20    (sleeping / very distracted)
  No pose data                         → last known score (or 50 neutral)

Smoothing: exponential moving average (α = 0.3) over samples within a 60s window.
State is stored module-level so the WebSocket handler and API can both access it.
"""

from __future__ import annotations
import time
from collections import deque
from typing import Optional

# ── Scoring parameters ────────────────────────────────────────────────────────

SMOOTH_WINDOW_SEC = 60.0   # time-based smoothing window (Phase 6 spec)
_ALPHA = 0.3                 # EMA smoothing factor
_NEUTRAL_SCORE = 50.0       # score used when pose is unknown
HIGH_THRESHOLD = 70.0        # green band lower bound
LOW_THRESHOLD = 40.0         # red band upper bound
PERSIST_INTERVAL_SEC = 2.0   # min seconds between DB writes per student

# ── Module-level state ────────────────────────────────────────────────────────
# Key: (session_id: str, student_id: str)
# Value: {"ema": float, "samples": deque[(ts, score)], "last_ts": float,
#         "frame_count": int, "last_persist_ts": float}
_state: dict[tuple[str, str], dict] = {}


def get_score_level(score: float) -> str:
    """Return high | medium | low for a 0–100 score."""
    if score >= HIGH_THRESHOLD:
        return "high"
    if score >= LOW_THRESHOLD:
        return "medium"
    return "low"


def _prune_old_samples(st: dict, now: float) -> None:
    cutoff = now - SMOOTH_WINDOW_SEC
    while st["samples"] and st["samples"][0][0] < cutoff:
        st["samples"].popleft()


def _pose_to_raw_score(pose: Optional[dict]) -> float:
    """Map a head-pose dict to a raw 0–100 score (not smoothed yet)."""
    if pose is None:
        return _NEUTRAL_SCORE

    yaw = abs(pose.get("yaw", 0.0))
    pitch = abs(pose.get("pitch", 0.0))
    deviation = max(yaw, pitch)

    if deviation < 15:
        score = 100.0 - (deviation / 15.0) * 20.0
    elif deviation < 30:
        score = 80.0 - ((deviation - 15.0) / 15.0) * 30.0
    elif deviation < 45:
        score = 50.0 - ((deviation - 30.0) / 15.0) * 30.0
    else:
        score = max(0.0, 20.0 - ((deviation - 45.0) / 45.0) * 20.0)

    return round(score, 1)


def update(
    session_id: str,
    student_id: str,
    pose: Optional[dict],
) -> float:
    """Update attention state and return the smoothed score (0–100)."""
    key = (session_id, student_id)
    raw = _pose_to_raw_score(pose)
    now = time.time()

    if key not in _state:
        _state[key] = {
            "ema": raw,
            "samples": deque([(now, raw)]),
            "last_ts": now,
            "frame_count": 1,
            "last_persist_ts": 0.0,
        }
    else:
        st = _state[key]
        st["samples"].append((now, raw))
        _prune_old_samples(st, now)
        st["ema"] = _ALPHA * raw + (1 - _ALPHA) * st["ema"]
        st["last_ts"] = now
        st["frame_count"] += 1

    return round(_state[key]["ema"], 1)


def get_score(session_id: str, student_id: str) -> float:
    """Return the current smoothed score for a student, or the neutral default."""
    key = (session_id, student_id)
    return round(_state.get(key, {}).get("ema", _NEUTRAL_SCORE), 1)


def get_session_scores(session_id: str) -> dict[str, float]:
    """Return {student_id: score} for all students tracked in a session."""
    return {
        sid: round(st["ema"], 1)
        for (sess, sid), st in _state.items()
        if sess == session_id
    }


def get_class_average(session_id: str) -> float:
    """Return the mean attention score across all students in a session."""
    scores = list(get_session_scores(session_id).values())
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 1)


def should_persist(session_id: str, student_id: str) -> bool:
    """Return True if enough time elapsed since last DB write (~2s)."""
    key = (session_id, student_id)
    st = _state.get(key)
    if st is None or st["frame_count"] <= 0:
        return False
    now = time.time()
    if now - st.get("last_persist_ts", 0.0) >= PERSIST_INTERVAL_SEC:
        st["last_persist_ts"] = now
        return True
    return False


def clear_session(session_id: str) -> None:
    """Remove all in-memory state for a session (call when session closes)."""
    keys = [k for k in _state if k[0] == session_id]
    for k in keys:
        del _state[k]
