"""
MLService — face detection for live classroom frames.
"""

import base64

import cv2
import numpy as np

from ml.face_detector import detect_faces_bgr


class MLService:
    def is_blurry(self, image, threshold=80):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return cv2.Laplacian(gray, cv2.CV_64F).var() < threshold

    def process_frame(self, base64_image: str) -> list[dict]:
        """Detect faces in a frame and return bounding boxes (percent coords)."""
        try:
            img_data = base64.b64decode(
                base64_image.split(",", 1)[1] if "," in base64_image else base64_image
            )
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return []

            faces = detect_faces_bgr(img)
            return [
                {
                    **face,
                    "status": "Detected",
                    "studentId": None,
                }
                for face in faces
            ]
        except Exception as exc:
            print(f"Error processing frame: {exc}")
            return []


ml_service = MLService()
