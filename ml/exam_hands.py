"""
Hand / wrist heuristic for smartwatch suspicion during exams.
Uses MediaPipe Hands when available.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_hands = None
_hands_ok = False


def _init_hands():
    global _hands, _hands_ok
    if _hands_ok or _hands is not None:
        return
    try:
        import mediapipe as mp

        _hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.4,
        )
        _hands_ok = True
        logger.info("ExamHands: MediaPipe Hands ready")
    except Exception as exc:
        logger.debug("ExamHands unavailable: %s", exc)
        _hands_ok = False


def is_ready() -> bool:
    _init_hands()
    return _hands_ok


def detect_watch_suspect(img_bgr) -> list[dict]:
    """
    Heuristic: hand landmarks near opposite wrist region.
    Returns list of {confidence, x, y, width, height} in percent coords.
    """
    _init_hands()
    if not _hands_ok or img_bgr is None:
        return []

    try:
        import cv2

        h, w = img_bgr.shape[:2]
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        result = _hands.process(rgb)
        if not result.multi_hand_landmarks:
            return []

        suspects = []
        for hand_lm in result.multi_hand_landmarks:
            wrist = hand_lm.landmark[0]
            index_mcp = hand_lm.landmark[5]
            wx, wy = wrist.x * w, wrist.y * h
            ix, iy = index_mcp.x * w, index_mcp.y * h
            dist = ((wx - ix) ** 2 + (wy - iy) ** 2) ** 0.5
            if dist < 0.08 * min(w, h):
                suspects.append(
                    {
                        "confidence": 0.5,
                        "x": round((wx / w) * 100 - 5, 2),
                        "y": round((wy / h) * 100 - 5, 2),
                        "width": 10.0,
                        "height": 10.0,
                    }
                )
        return suspects
    except Exception as exc:
        logger.debug("Hand detection failed: %s", exc)
        return []
