from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO


@dataclass(frozen=True)
class FaceDetection:
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float


class FaceDetector:
    def __init__(self, *, yolo_model_path: str, yolo_device: str = "cpu") -> None:
        self._yolo_device = yolo_device
        self._yolo_model: YOLO | None = None
        self._haar_detector: cv2.CascadeClassifier | None = None
        self._mode: str = "haar"

        model_path = Path(yolo_model_path)
        if model_path.exists() and model_path.is_file():
            self._yolo_model = YOLO(str(model_path))
            self._mode = "yolo"
            print(f"[startup] detector=yolo model={model_path} device={self._yolo_device}", flush=True)
        else:
            haar_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
            self._haar_detector = cv2.CascadeClassifier(str(haar_path))
            if self._haar_detector.empty():
                raise RuntimeError(f"Failed to initialize Haar cascade from {haar_path}")
            self._mode = "haar"
            print(
                f"[startup] YOLO model missing at '{yolo_model_path}', using Haar fallback",
                flush=True,
            )

    @property
    def mode(self) -> str:
        return self._mode

    def detect(self, frame_bgr: np.ndarray) -> list[FaceDetection]:
        h, w = frame_bgr.shape[:2]

        if self._yolo_model is not None:
            results = self._yolo_model.predict(frame_bgr, device=self._yolo_device, verbose=False)
            boxes = results[0].boxes
            xyxy = boxes.xyxy.cpu().numpy() if boxes.xyxy is not None else np.empty((0, 4), dtype=np.float32)
            conf = boxes.conf.cpu().numpy() if boxes.conf is not None else np.empty((0,), dtype=np.float32)

            detections: list[FaceDetection] = []
            for idx, box in enumerate(xyxy):
                x1 = max(0, int(box[0]))
                y1 = max(0, int(box[1]))
                x2 = min(w - 1, int(box[2]))
                y2 = min(h - 1, int(box[3]))
                if x2 <= x1 or y2 <= y1:
                    continue
                confidence = float(conf[idx]) if idx < len(conf) else 0.0
                detections.append(FaceDetection(x1=x1, y1=y1, x2=x2, y2=y2, confidence=confidence))
            return detections

        assert self._haar_detector is not None
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        rects = self._haar_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

        detections = []
        for x, y, box_w, box_h in rects:
            x1 = max(0, int(x))
            y1 = max(0, int(y))
            x2 = min(w - 1, int(x + box_w))
            y2 = min(h - 1, int(y + box_h))
            if x2 <= x1 or y2 <= y1:
                continue
            detections.append(FaceDetection(x1=x1, y1=y1, x2=x2, y2=y2, confidence=1.0))
        return detections
