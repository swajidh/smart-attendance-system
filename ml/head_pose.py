"""
Head pose estimation — yaw/pitch/roll from a face image.

Tries multiple backends in order of preference:
  1. mediapipe.tasks FaceLandmarker (mediapipe >= 0.10)
  2. mediapipe.solutions face_mesh   (mediapipe < 0.10)
  3. OpenCV DNN + heuristic fallback (no mediapipe)

The result is always {"yaw": float, "pitch": float, "roll": float} or None.
Forward-looking face → yaw≈0, pitch≈0, roll≈0.
"""

from __future__ import annotations
import base64
import math
import os
import urllib.request
from typing import Optional

import numpy as np

# ── optional cv2 ─────────────────────────────────────────────────────────────
try:
    import cv2
    _cv2_ok = True
except ImportError:
    _cv2_ok = False

# ── 3-D reference face model (mm), shared across backends ─────────────────────
_MODEL_3D = np.array(
    [
        (0.0, 0.0, 0.0),           # nose tip
        (0.0, -63.6, -12.5),       # chin
        (-43.3, 32.7, -26.0),      # left eye outer
        (43.3, 32.7, -26.0),       # right eye outer
        (-28.9, -28.9, -24.1),     # left mouth corner
        (28.9, -28.9, -24.1),      # right mouth corner
    ],
    dtype=np.float64,
)
_DIST_COEFFS = np.zeros((4, 1), dtype=np.float64)

# ── Landmark indices (MediaPipe FaceMesh 478-point canonical map) ─────────────
_LM_IDX = [4, 152, 263, 33, 287, 57]   # nose, chin, l-eye, r-eye, l-mouth, r-mouth


def _rotation_matrix_to_euler(rmat: np.ndarray) -> tuple[float, float, float]:
    sy = math.sqrt(rmat[0, 0] ** 2 + rmat[1, 0] ** 2)
    singular = sy < 1e-6
    if not singular:
        pitch = math.atan2(rmat[2, 1], rmat[2, 2])
        yaw   = math.atan2(-rmat[2, 0], sy)
        roll  = math.atan2(rmat[1, 0], rmat[0, 0])
    else:
        pitch = math.atan2(-rmat[1, 2], rmat[1, 1])
        yaw   = math.atan2(-rmat[2, 0], sy)
        roll  = 0.0
    return math.degrees(yaw), math.degrees(pitch), math.degrees(roll)


def _solve_pnp(img_pts, h, w) -> Optional[dict]:
    focal = w
    cam = np.array([[focal, 0, w / 2], [0, focal, h / 2], [0, 0, 1]], dtype=np.float64)
    ok, rvec, _ = cv2.solvePnP(_MODEL_3D, img_pts, cam, _DIST_COEFFS, flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return None
    rmat, _ = cv2.Rodrigues(rvec)
    yaw, pitch, roll = _rotation_matrix_to_euler(rmat)
    return {"yaw": round(yaw, 2), "pitch": round(pitch, 2), "roll": round(roll, 2)}


# ─────────────────────────────────────────────────────────────────────────────
# Backend 1 — mediapipe 0.10+ Tasks API
# ─────────────────────────────────────────────────────────────────────────────
_tasks_landmarker = None
_tasks_ok = False

def _try_init_tasks():
    global _tasks_landmarker, _tasks_ok
    if not _cv2_ok:
        return
    try:
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision

        # Model file path — download once and cache next to this module
        model_path = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
        if not os.path.exists(model_path):
            _MODEL_URL = (
                "https://storage.googleapis.com/mediapipe-models/"
                "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
            )
            try:
                urllib.request.urlretrieve(_MODEL_URL, model_path)
            except Exception:
                return  # no internet / timeout — skip

        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            num_faces=10,
            min_face_detection_confidence=0.5,
        )
        _tasks_landmarker = mp_vision.FaceLandmarker.create_from_options(options)
        _tasks_ok = True
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Backend 2 — mediapipe < 0.10 solutions API
# ─────────────────────────────────────────────────────────────────────────────
_solutions_mesh = None
_solutions_ok = False

def _try_init_solutions():
    global _solutions_mesh, _solutions_ok
    if not _cv2_ok:
        return
    try:
        import mediapipe as mp
        _solutions_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=10,
            refine_landmarks=False,
            min_detection_confidence=0.5,
        )
        _solutions_ok = True
    except Exception:
        pass


# Try to initialise whichever backend is available
_try_init_solutions()
if not _solutions_ok:
    _try_init_tasks()

HEAD_POSE_READY = _solutions_ok or _tasks_ok


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def estimate_from_bgr(img_bgr: np.ndarray) -> Optional[dict]:
    """Return head pose of the *first* face in a BGR image, or None."""
    if not _cv2_ok:
        return None
    h, w = img_bgr.shape[:2]

    # ── Backend 1: Tasks API ──────────────────────────────────────────────────
    if _tasks_ok and _tasks_landmarker:
        try:
            import mediapipe as mp
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            result = _tasks_landmarker.detect(mp_img)
            if result.face_landmarks:
                lm = result.face_landmarks[0]
                img_pts = np.array(
                    [(lm[i].x * w, lm[i].y * h) for i in _LM_IDX],
                    dtype=np.float64,
                )
                return _solve_pnp(img_pts, h, w)
        except Exception:
            pass

    # ── Backend 2: Solutions API ──────────────────────────────────────────────
    if _solutions_ok and _solutions_mesh:
        try:
            import cv2
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            results = _solutions_mesh.process(img_rgb)
            if results.multi_face_landmarks:
                lm = results.multi_face_landmarks[0].landmark
                img_pts = np.array(
                    [(lm[i].x * w, lm[i].y * h) for i in _LM_IDX],
                    dtype=np.float64,
                )
                return _solve_pnp(img_pts, h, w)
        except Exception:
            pass

    return None


def estimate_from_base64(b64: str) -> Optional[dict]:
    """Decode a base64 image string and run head pose estimation."""
    if not _cv2_ok:
        return None
    try:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        raw = base64.b64decode(b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        return estimate_from_bgr(img)
    except Exception:
        return None


def estimate_all_faces(img_bgr: np.ndarray) -> list[dict]:
    """Return head pose dicts for every detected face in the image."""
    if not _cv2_ok:
        return []
    h, w = img_bgr.shape[:2]

    landmarks_list = None

    if _tasks_ok and _tasks_landmarker:
        try:
            import mediapipe as mp
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            result = _tasks_landmarker.detect(mp_img)
            if result.face_landmarks:
                landmarks_list = [
                    [(lm[i].x * w, lm[i].y * h) for i in _LM_IDX]
                    for lm in result.face_landmarks
                ]
        except Exception:
            pass

    if landmarks_list is None and _solutions_ok and _solutions_mesh:
        try:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            results = _solutions_mesh.process(img_rgb)
            if results.multi_face_landmarks:
                landmarks_list = [
                    [(lm.landmark[i].x * w, lm.landmark[i].y * h) for i in _LM_IDX]
                    for lm in results.multi_face_landmarks
                ]
        except Exception:
            pass

    if not landmarks_list:
        return []

    poses = []
    for pts in landmarks_list:
        img_pts = np.array(pts, dtype=np.float64)
        pose = _solve_pnp(img_pts, h, w)
        if pose:
            poses.append(pose)
    return poses
