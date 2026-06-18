"""
Image quality validation for face enrollment.

Checks performed:
  1. Blur  — Laplacian variance < threshold
  2. Brightness — mean pixel intensity outside [40, 220]
  3. Face count — uses MediaPipe; expects exactly one face
"""

from __future__ import annotations
import cv2
import numpy as np
import base64
from dataclasses import dataclass
from typing import Literal

try:
    import mediapipe as mp
    _mp_face_detect = mp.solutions.face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=0.5
    )
except Exception:
    _mp_face_detect = None

QualityStatus = Literal["ok", "blurry", "too_dark", "too_bright", "no_face", "multiple_faces"]


@dataclass
class QualityResult:
    status: QualityStatus
    blur_score: float
    brightness: float
    face_count: int
    message: str

    @property
    def ok(self) -> bool:
        return self.status == "ok"


# ── Thresholds ────────────────────────────────────────────────────────────────
BLUR_THRESHOLD = 80.0      # Laplacian variance below this = blurry
BRIGHTNESS_MIN = 40.0      # too dark
BRIGHTNESS_MAX = 220.0     # over-exposed


def validate_image_bgr(img: np.ndarray) -> QualityResult:
    """Run all quality checks on a BGR numpy image."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Blur
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 2. Brightness
    brightness = float(gray.mean())

    if blur_score < BLUR_THRESHOLD:
        return QualityResult("blurry", blur_score, brightness, 0,
                             f"Image too blurry (score {blur_score:.1f} < {BLUR_THRESHOLD})")
    if brightness < BRIGHTNESS_MIN:
        return QualityResult("too_dark", blur_score, brightness, 0,
                             f"Image too dark (brightness {brightness:.1f})")
    if brightness > BRIGHTNESS_MAX:
        return QualityResult("too_bright", blur_score, brightness, 0,
                             f"Image over-exposed (brightness {brightness:.1f})")

    # 3. Face detection
    face_count = _count_faces(img)
    if face_count == 0:
        return QualityResult("no_face", blur_score, brightness, 0,
                             "No face detected in image")
    if face_count > 1:
        return QualityResult("multiple_faces", blur_score, brightness, face_count,
                             f"{face_count} faces detected; ensure only the student is in frame")

    return QualityResult("ok", blur_score, brightness, 1, "Image quality acceptable")


def validate_base64(b64: str) -> QualityResult:
    """Decode a base64 image string and validate quality."""
    try:
        raw = b64.split(",", 1)[1] if "," in b64 else b64
        img_bytes = base64.b64decode(raw)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return QualityResult("no_face", 0.0, 0.0, 0, "Could not decode image")
        return validate_image_bgr(img)
    except Exception as exc:
        return QualityResult("no_face", 0.0, 0.0, 0, f"Decode error: {exc}")


def _count_faces(img_bgr: np.ndarray) -> int:
    if _mp_face_detect is None:
        return 1  # assume ok if mediapipe unavailable
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    results = _mp_face_detect.process(rgb)
    return len(results.detections) if results.detections else 0
