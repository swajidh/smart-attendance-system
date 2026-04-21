import cv2
import mediapipe as mp
import numpy as np
import base64

class MLService:
    def __init__(self):
        self.mp_face_detection = mp.solutions.face_detection
        # Initialize Face Detection with a lightweight model (model_selection=0 is fast/short-range)
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=0.5
        )

    def process_frame(self, base64_image: str):
        """
        Process a base64 encoded image frame, detect faces, and return bounding boxes.
        """
        try:
            # Decode base64 image
            img_data = base64.b64decode(base64_image.split(',')[1] if ',' in base64_image else base64_image)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return []

            # Convert the BGR image to RGB
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Process the image and find faces
            results = self.face_detection.process(rgb_img)
            
            faces = []
            if results.detections:
                h, w, _ = img.shape
                for detection in results.detections:
                    bboxC = detection.location_data.relative_bounding_box
                    # Convert relative coordinates to absolute pixel values (or percentages)
                    # We return percentages for the frontend to render dynamically
                    faces.append({
                        "x": bboxC.xmin * 100,
                        "y": bboxC.ymin * 100,
                        "width": bboxC.width * 100,
                        "height": bboxC.height * 100,
                        "confidence": detection.score[0],
                        # Mocking recognition logic for now: Random chance to be a known student
                        "status": "Present" if np.random.rand() > 0.3 else "Unknown",
                        "studentId": "STU-" + str(np.random.randint(1000, 9999)) if np.random.rand() > 0.3 else None
                    })
            
            return faces
        except Exception as e:
            print(f"Error processing frame: {e}")
            return []

ml_service = MLService()
