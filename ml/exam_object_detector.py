"""
Object detection for exam proctoring — phones, books, etc.
Uses Ultralytics YOLOv8n (COCO classes).
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

COCO_PHONE = 67
COCO_BOOK = 73
CLASS_LABELS = {
    COCO_PHONE: "cell phone",
    COCO_BOOK: "book",
}

_model = None
_model_ok = False
_frame_counter = 0
DETECTION_INTERVAL = 1
MIN_CONFIDENCE = 0.30
INFERENCE_SIZE = 960
PHONE_CONF_FACTOR = 0.65  # effective min ≈ 0.20 at default MIN_CONFIDENCE

_PKG_DIR = __import__("pathlib").Path(__file__).resolve().parent
_MODEL_PATH = _PKG_DIR / "yolov8n.pt"


def _init_model():
    global _model, _model_ok
    if _model_ok:
        return
    try:
        from ultralytics import YOLO

        _model = YOLO(str(_MODEL_PATH))
        _model.overrides["conf"] = MIN_CONFIDENCE
        _model.overrides["imgsz"] = INFERENCE_SIZE
        _model.overrides["max_det"] = 50
        _model_ok = True
        logger.info("ExamObjectDetector: YOLOv8n ready (%s)", _MODEL_PATH)
    except Exception as exc:
        logger.warning("ExamObjectDetector unavailable: %s", exc)
        _model_ok = False


def preload() -> bool:
    """Warm up YOLO at startup so the first exam frame is not skipped."""
    _init_model()
    return _model_ok


def is_ready() -> bool:
    _init_model()
    return _model_ok


def detect_objects_bgr(img_bgr, min_confidence: float = MIN_CONFIDENCE) -> tuple[list[dict], bool]:
    """
    Detect forbidden objects. Returns (detections, ran_this_frame).
    detections: list of {label, class_id, confidence, x, y, width, height} in percentage coords.
    """
    global _frame_counter
    _frame_counter += 1
    if _frame_counter % DETECTION_INTERVAL != 0:
        return [], False

    _init_model()
    if not _model_ok or img_bgr is None:
        return [], True

    try:
        import cv2

        h, w = img_bgr.shape[:2]
        new_w = INFERENCE_SIZE
        new_h = max(1, int(h * (new_w / w)))
        resized = cv2.resize(img_bgr, (new_w, new_h))
        results = _model(resized, verbose=False)
        detected = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls = int(box.cls[0])
                if cls not in CLASS_LABELS:
                    continue
                conf = float(box.conf[0])
                if cls == COCO_PHONE:
                    min_conf = min_confidence * PHONE_CONF_FACTOR
                else:
                    min_conf = min_confidence
                if conf < min_conf:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x1 = x1 * (w / new_w)
                x2 = x2 * (w / new_w)
                y1 = y1 * (h / new_h)
                y2 = y2 * (h / new_h)
                detected.append(
                    {
                        "label": CLASS_LABELS[cls],
                        "class_id": cls,
                        "confidence": round(conf, 3),
                        "x": round(x1 / w * 100, 2),
                        "y": round(y1 / h * 100, 2),
                        "width": round((x2 - x1) / w * 100, 2),
                        "height": round((y2 - y1) / h * 100, 2),
                    }
                )
        return detected, True
    except Exception as exc:
        logger.debug("Object detection failed: %s", exc)
        return [], True


def link_object_to_face(obj: dict, face: dict, max_distance_pct: float = 35.0) -> bool:
    """True if object bbox is near face bbox (extended downward for desk / hand area)."""
    label = obj.get("label", "")
    if label == "cell phone":
        max_distance_pct = 55.0
        dy_mult = 3.0
    else:
        dy_mult = 1.8

    fx = face.get("x", 0) + face.get("width", 0) / 2
    fy = face.get("y", 0) + face.get("height", 0) / 2
    ox = obj.get("x", 0) + obj.get("width", 0) / 2
    oy = obj.get("y", 0) + obj.get("height", 0) / 2
    dx = abs(fx - ox)
    dy = abs(fy - oy)
    return dx < max_distance_pct and dy < max_distance_pct * dy_mult


def nearest_enrolled_face(obj: dict, faces: list[dict]) -> str | None:
    """Return studentUuid of closest enrolled face to an object, if within link distance."""
    best_id = None
    best_dist = float("inf")
    for face in faces:
        sid = face.get("studentUuid")
        if not sid:
            continue
        if link_object_to_face(obj, face):
            fx = face.get("x", 0) + face.get("width", 0) / 2
            fy = face.get("y", 0) + face.get("height", 0) / 2
            ox = obj.get("x", 0) + obj.get("width", 0) / 2
            oy = obj.get("y", 0) + obj.get("height", 0) / 2
            dist = (fx - ox) ** 2 + (fy - oy) ** 2
            if dist < best_dist:
                best_dist = dist
                best_id = sid
    return best_id
