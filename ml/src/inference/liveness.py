from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Protocol

import numpy as np

LivenessDecision = Literal["allow", "deny", "uncertain"]


@dataclass(frozen=True)
class FaceBox:
    x1: int
    y1: int
    x2: int
    y2: int


@dataclass(frozen=True)
class LivenessResult:
    decision: LivenessDecision
    reason: str


class LivenessChecker(Protocol):
    def check(self, frame: np.ndarray, bbox: FaceBox, student_id: str) -> LivenessResult:
        ...


class NoOpLivenessChecker:
    """
    Default checker for prototype.
    Always allows, but keeps a strict interface for future anti-spoof integration.
    """

    def check(self, frame: np.ndarray, bbox: FaceBox, student_id: str) -> LivenessResult:
        _ = frame
        _ = bbox
        _ = student_id
        return LivenessResult(decision="allow", reason="noop_checker")


def log_liveness_decision(
    *,
    student_id: str,
    bbox: FaceBox,
    result: LivenessResult,
) -> None:
    # No image/frame bytes are logged; only non-PII operational metadata.
    print(
        {
            "event": "liveness_decision",
            "ts": datetime.now(timezone.utc).isoformat(),
            "student_id": student_id,
            "bbox": {"x1": bbox.x1, "y1": bbox.y1, "x2": bbox.x2, "y2": bbox.y2},
            "decision": result.decision,
            "reason": result.reason,
        },
        flush=True,
    )
