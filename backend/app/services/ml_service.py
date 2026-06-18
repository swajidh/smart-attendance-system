"""
MLService — used by the legacy /attendance WebSocket route and process_frame.

Phase 3 changes:
  - enroll_student now delegates to student_service.enroll_face (real embeddings via ml/).
  - The in-memory student_embeddings dict is removed.
  - process_frame recognition is still mocked for Phase 3; it will be replaced by
    the real FaceMatcher in Phase 4 (session attendance processing).
"""

import sys
import os
import cv2
import numpy as np
import base64

# Ensure project root is on path so `ml/` is importable
_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

try:
    import mediapipe as mp
    _mp_face = mp.solutions.face_detection
    _face_detector = _mp_face.FaceDetection(model_selection=0, min_detection_confidence=0.5)
except Exception:
    _mp_face = None
    _face_detector = None

try:
    from ml.face_encoder import get_embedding_from_base64, EMBEDDING_DIM
    from ml.face_matcher import FaceMatcher
    from ml.quality_validator import validate_base64
    _ml_ready = True
    _matcher = FaceMatcher(threshold=0.55)
except Exception as exc:
    _ml_ready = False
    _matcher = None
    EMBEDDING_DIM = 512


class MLService:
    def __init__(self):
        self.face_detection = _face_detector

    def is_blurry(self, image, threshold=80):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return cv2.Laplacian(gray, cv2.CV_64F).var() < threshold

    def process_frame(self, base64_image: str) -> list[dict]:
        """
        Detect faces in a frame and return bounding boxes.
        Recognition (matching embeddings) is Phase 4 — still returns placeholder status.
        """
        try:
            img_data = base64.b64decode(
                base64_image.split(",", 1)[1] if "," in base64_image else base64_image
            )
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return []

            if self.face_detection is None:
                return []

            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = self.face_detection.process(rgb_img)

            faces = []
            if results.detections:
                for detection in results.detections:
                    bboxC = detection.location_data.relative_bounding_box
                    faces.append({
                        "x": bboxC.xmin * 100,
                        "y": bboxC.ymin * 100,
                        "width": bboxC.width * 100,
                        "height": bboxC.height * 100,
                        "confidence": detection.score[0],
                        # Phase 4 will replace with real FaceMatcher lookup
                        "status": "Detected",
                        "studentId": None,
                    })
            return faces
        except Exception as exc:
            print(f"Error processing frame: {exc}")
            return []


ml_service = MLService()
