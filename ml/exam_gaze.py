"""
Exam gaze evaluation — hall/CCTV mode with calibrated paper baseline.

Unlike classroom attention (forward = good), exam monitoring expects students
to look DOWN at paper. Baseline yaw/pitch is captured during calibration.
"""

from __future__ import annotations

from typing import Optional

DEFAULT_YAW_THRESHOLD = 28.0
DEFAULT_PITCH_UP_DELTA = 15.0
DEFAULT_IRIS_OFFSET_THRESHOLD = 0.08


def compute_baseline(pose_samples: list[dict]) -> dict:
    """Compute room median yaw/pitch from calibration samples."""
    if not pose_samples:
        return {"baseline_yaw": 0.0, "baseline_pitch": 25.0, "sample_count": 0}
    yaws = [s["yaw"] for s in pose_samples if "yaw" in s]
    pitches = [s["pitch"] for s in pose_samples if "pitch" in s]
    if not yaws or not pitches:
        return {"baseline_yaw": 0.0, "baseline_pitch": 25.0, "sample_count": 0}
    yaws.sort()
    pitches.sort()
    mid = len(yaws) // 2
    return {
        "baseline_yaw": round(yaws[mid], 2),
        "baseline_pitch": round(pitches[mid], 2),
        "sample_count": len(yaws),
    }


def evaluate_gaze(
    pose: Optional[dict],
    baseline_yaw: float = 0.0,
    baseline_pitch: float = 25.0,
    yaw_threshold: float = DEFAULT_YAW_THRESHOLD,
    pitch_up_delta: float = DEFAULT_PITCH_UP_DELTA,
    iris_offset: Optional[float] = None,
    iris_threshold: float = DEFAULT_IRIS_OFFSET_THRESHOLD,
) -> dict:
    """
    Return gaze status for exam paper monitoring.
    status: on_paper | away | unknown
    """
    if pose is None:
        return {"status": "unknown", "reason": "no_pose", "violating": False}

    yaw = pose.get("yaw", 0.0)
    pitch = pose.get("pitch", 0.0)
    yaw_dev = abs(yaw - baseline_yaw)
    pitch_up = baseline_pitch - pitch

    reasons = []
    if yaw_dev > yaw_threshold:
        reasons.append("horizontal_away")
    if pitch_up > pitch_up_delta:
        reasons.append("looking_up")
    if iris_offset is not None and abs(iris_offset) > iris_threshold:
        reasons.append("iris_away")

    if reasons:
        return {
            "status": "away",
            "reason": ",".join(reasons),
            "violating": True,
            "yaw": yaw,
            "pitch": pitch,
            "yaw_dev": round(yaw_dev, 1),
            "pitch_up": round(pitch_up, 1),
        }

    return {
        "status": "on_paper",
        "reason": "ok",
        "violating": False,
        "yaw": yaw,
        "pitch": pitch,
        "yaw_dev": round(yaw_dev, 1),
        "pitch_up": round(pitch_up, 1),
    }
