"""
Face encoder — generates normalized 512-d (or 576-d fallback) embeddings.

Primary path  (if facenet-pytorch available):
  MTCNN face alignment + InceptionResnetV1(pretrained='vggface2') → 512-d
Fallback path (torchvision only):
  MediaPipe crop + MobileNetV3-Small feature pool → 576-d

Both paths return a **unit-normalized** float list so cosine similarity works
identically regardless of which backend is active.
"""

from __future__ import annotations
import logging
import base64
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── Try primary backend (facenet-pytorch) ────────────────────────────────────
_facenet_available = False
_mtcnn = None
_resnet = None

try:
    import torch
    from facenet_pytorch import MTCNN, InceptionResnetV1

    _device = torch.device("cpu")
    _mtcnn = MTCNN(image_size=160, margin=20, keep_all=False, device=_device)
    _resnet = InceptionResnetV1(pretrained="vggface2").eval().to(_device)
    _facenet_available = True
    EMBEDDING_DIM = 512
    logger.info("FaceEncoder: using facenet-pytorch (InceptionResnetV1, 512-d)")
except ImportError:
    logger.info("FaceEncoder: facenet-pytorch not available — using MobileNetV3 fallback (576-d)")
except Exception as exc:
    logger.warning("FaceEncoder: facenet-pytorch load error (%s) — using fallback", exc)


# ── Fallback backend (torchvision MobileNetV3) ───────────────────────────────
_mobilenet = None
_mobilenet_transform = None

if not _facenet_available:
    try:
        import torch
        import torchvision.models as tv_models
        import torchvision.transforms as transforms
        from PIL import Image as PILImage

        _mn = tv_models.mobilenet_v3_small(weights=tv_models.MobileNet_V3_Small_Weights.DEFAULT)
        # Remove classifier; keep adaptive_avg_pool → 576-d feature vector
        _mobilenet = torch.nn.Sequential(*list(_mn.children())[:-1]).eval()
        _mobilenet_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        EMBEDDING_DIM = 576
        logger.info("FaceEncoder: MobileNetV3-Small fallback loaded (576-d)")
    except Exception as exc:
        logger.error("FaceEncoder: fallback also failed (%s) — embeddings unavailable", exc)
        EMBEDDING_DIM = 0

# MediaPipe face detection (for fallback cropping)
try:
    import mediapipe as mp
    _mp_face = mp.solutions.face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=0.5
    )
except Exception:
    _mp_face = None


# ── Public API ────────────────────────────────────────────────────────────────

def get_embedding(img_bgr: np.ndarray) -> Optional[list[float]]:
    """
    Generate a unit-normalized face embedding from a BGR numpy image.
    Returns None if no face is found or the encoder is unavailable.
    """
    if _facenet_available:
        return _facenet_embed(img_bgr)
    if _mobilenet is not None:
        return _mobilenet_embed(img_bgr)
    return None


def get_embedding_from_base64(b64: str) -> Optional[list[float]]:
    """Decode base64 image then embed."""
    try:
        raw = b64.split(",", 1)[1] if "," in b64 else b64
        img_bytes = base64.b64decode(raw)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        return get_embedding(img)
    except Exception as exc:
        logger.debug("get_embedding_from_base64 error: %s", exc)
        return None


def average_embeddings(embeddings: list[list[float]]) -> list[float]:
    """Mean-pool multiple embeddings into one, then re-normalize."""
    arr = np.array(embeddings, dtype=np.float32)
    mean = arr.mean(axis=0)
    norm = np.linalg.norm(mean)
    if norm > 0:
        mean /= norm
    return mean.tolist()


# ── Private helpers ───────────────────────────────────────────────────────────

def _facenet_embed(img_bgr: np.ndarray) -> Optional[list[float]]:
    import torch
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    from PIL import Image as PILImage
    pil_img = PILImage.fromarray(rgb)
    try:
        face_tensor = _mtcnn(pil_img)  # returns (1, 3, 160, 160) or None
    except Exception:
        return None
    if face_tensor is None:
        return None
    with torch.no_grad():
        embedding = _resnet(face_tensor.unsqueeze(0)).squeeze().numpy()
    embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
    return embedding.tolist()


def _mobilenet_embed(img_bgr: np.ndarray) -> Optional[list[float]]:
    """Crop face region with MediaPipe, then extract MobileNetV3 features."""
    import torch
    from PIL import Image as PILImage

    cropped = _crop_face(img_bgr)
    if cropped is None:
        return None

    rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
    pil_img = PILImage.fromarray(rgb)
    tensor = _mobilenet_transform(pil_img).unsqueeze(0)

    with torch.no_grad():
        feat = _mobilenet(tensor)          # (1, 576, 1, 1)
        feat = feat.squeeze().numpy()       # (576,)

    feat = feat / (np.linalg.norm(feat) + 1e-8)
    return feat.tolist()


def _crop_face(img_bgr: np.ndarray, padding: float = 0.2) -> Optional[np.ndarray]:
    """Crop the first detected face with padding. Falls back to center crop."""
    if _mp_face is not None:
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        results = _mp_face.process(rgb)
        if results.detections:
            h, w = img_bgr.shape[:2]
            box = results.detections[0].location_data.relative_bounding_box
            x1 = max(0, int((box.xmin - padding * box.width) * w))
            y1 = max(0, int((box.ymin - padding * box.height) * h))
            x2 = min(w, int((box.xmin + (1 + padding) * box.width) * w))
            y2 = min(h, int((box.ymin + (1 + padding) * box.height) * h))
            crop = img_bgr[y1:y2, x1:x2]
            if crop.size > 0:
                return crop

    # Fallback: center square crop
    h, w = img_bgr.shape[:2]
    side = min(h, w)
    y0 = (h - side) // 2
    x0 = (w - side) // 2
    return img_bgr[y0:y0 + side, x0:x0 + side]
