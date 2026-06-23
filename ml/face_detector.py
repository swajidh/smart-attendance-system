"""
Face detection for live frames — returns bounding boxes as percentage coords (0–100).

Backends (first success wins):
  1. facenet-pytorch MTCNN  (same stack as enrollment embeddings)
  2. MediaPipe FaceDetection (legacy solutions API)
  3. MediaPipe FaceLandmarker tasks API
"""

from __future__ import annotations

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── MTCNN (facenet-pytorch) ───────────────────────────────────────────────────
_mtcnn = None
_mtcnn_ok = False
try:
    import torch
    from facenet_pytorch import MTCNN

    _mtcnn = MTCNN(keep_all=True, device=torch.device("cpu"))
    _mtcnn_ok = True
    logger.info("FaceDetector: MTCNN backend ready")
except Exception as exc:
    logger.info("FaceDetector: MTCNN unavailable (%s)", exc)

# ── MediaPipe solutions ───────────────────────────────────────────────────────
_mp_solutions_detect = None
try:
    import mediapipe as mp

    _mp_solutions_detect = mp.solutions.face_detection.FaceDetection(
        model_selection=1,  # full-range model (better for webcam distance)
        min_detection_confidence=0.35,
    )
    logger.info("FaceDetector: MediaPipe solutions backend ready")
except Exception as exc:
    logger.debug("FaceDetector: MediaPipe solutions unavailable (%s)", exc)


def detect_faces_bgr(img_bgr: np.ndarray) -> list[dict]:
    """
    Detect faces in a BGR image.

    Returns:
        [{x, y, width, height, confidence}] with x/y/width/height in 0–100 percent.
    """
    if img_bgr is None or img_bgr.size == 0:
        return []

    faces = _detect_mtcnn(img_bgr)
    if faces:
        return faces

    faces = _detect_mp_solutions(img_bgr)
    if faces:
        return faces

    return []


def detect_faces_base64(b64: str) -> list[dict]:
    """Decode base64 (optionally data-URL prefixed) and detect faces."""
    try:
        raw = b64.split(",", 1)[1] if "," in b64 else b64
        import base64 as b64mod

        img_bytes = b64mod.b64decode(raw)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []
        return detect_faces_bgr(img)
    except Exception as exc:
        logger.debug("detect_faces_base64 error: %s", exc)
        return []


def _detect_mtcnn(img_bgr: np.ndarray) -> list[dict]:
    if not _mtcnn_ok or _mtcnn is None:
        return []
    try:
        from PIL import Image as PILImage

        h, w = img_bgr.shape[:2]
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        pil = PILImage.fromarray(rgb)
        boxes, probs = _mtcnn.detect(pil)
        if boxes is None:
            return []

        faces = []
        for box, prob in zip(boxes, probs):
            x1, y1, x2, y2 = box
            bw = max(1.0, x2 - x1)
            bh = max(1.0, y2 - y1)
            faces.append({
                "x": float(max(0.0, x1 / w * 100)),
                "y": float(max(0.0, y1 / h * 100)),
                "width": float(min(100.0, bw / w * 100)),
                "height": float(min(100.0, bh / h * 100)),
                "confidence": float(prob) if prob is not None else 0.9,
            })
        return faces
    except Exception as exc:
        logger.debug("MTCNN detect error: %s", exc)
        return []


def _detect_mp_solutions(img_bgr: np.ndarray) -> list[dict]:
    if _mp_solutions_detect is None:
        return []
    try:
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = _mp_solutions_detect.process(rgb)
        if not results.detections:
            return []

        faces = []
        for detection in results.detections:
            box = detection.location_data.relative_bounding_box
            faces.append({
                "x": box.xmin * 100,
                "y": box.ymin * 100,
                "width": box.width * 100,
                "height": box.height * 100,
                "confidence": float(detection.score[0]),
            })
        return faces
    except Exception as exc:
        logger.debug("MediaPipe solutions detect error: %s", exc)
        return []
