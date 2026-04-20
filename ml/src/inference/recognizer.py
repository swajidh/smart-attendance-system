from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
import pickle
import time
from typing import Any

import cv2
import numpy as np
from deepface import DeepFace


@dataclass(frozen=True)
class RecognitionResult:
    student_id: str | None
    similarity: float | None
    top2_similarity: float | None
    color_bgr: tuple[int, int, int]
    label: str


class FaceRecognizer:
    def __init__(
        self,
        *,
        known_faces_path: str,
        model_name: str,
        detector_backend: str,
        enforce_detection: bool,
        similarity_threshold: float,
        min_similarity_gap: float,
        unknown_label: str = "Unknown",
        cache_ttl_seconds: float = 5.0,
        cache_max_entries: int = 256,
    ) -> None:
        self._known_faces = self._load_known_faces(Path(known_faces_path))
        self._model_name = model_name
        self._detector_backend = detector_backend
        self._enforce_detection = enforce_detection
        self._similarity_threshold = similarity_threshold
        self._min_similarity_gap = min_similarity_gap
        self._unknown_label = unknown_label
        self._cache_ttl_seconds = cache_ttl_seconds
        self._cache_max_entries = cache_max_entries
        self._cache: dict[str, tuple[float, RecognitionResult]] = {}

    def recognize_crop(self, crop_bgr: np.ndarray) -> RecognitionResult:
        cache_key = self._cache_key(crop_bgr)
        now = time.monotonic()
        cached = self._cache.get(cache_key)
        if cached is not None:
            ts, result = cached
            if (now - ts) <= self._cache_ttl_seconds:
                return result

        try:
            emb = self._embedding_from_crop(crop_bgr)
        except Exception as exc:
            print(f"[recognizer] embedding_failed: {exc}", flush=True)
            result = RecognitionResult(
                student_id=None,
                similarity=None,
                top2_similarity=None,
                color_bgr=(0, 0, 255),
                label=f"{self._unknown_label} (embedding_failed)",
            )
            self._cache_put(cache_key, result)
            return result

        student_id, best_similarity, top2_similarity = self._match_student(emb)
        if student_id is None:
            similarity_text = f"{best_similarity:.2f}" if best_similarity is not None else "n/a"
            gap_text = (
                f", gap={(best_similarity - top2_similarity):.2f}"
                if best_similarity is not None and top2_similarity is not None
                else ""
            )
            result = RecognitionResult(
                student_id=None,
                similarity=best_similarity,
                top2_similarity=top2_similarity,
                color_bgr=(0, 0, 255),
                label=f"{self._unknown_label} (sim={similarity_text}{gap_text})",
            )
            self._cache_put(cache_key, result)
            return result

        result = RecognitionResult(
            student_id=student_id,
            similarity=best_similarity,
            top2_similarity=top2_similarity,
            color_bgr=(0, 255, 0),
            label=f"Recognized: {student_id} (sim={best_similarity:.2f})",
        )
        self._cache_put(cache_key, result)
        return result

    def _load_known_faces(self, path: Path) -> dict[str, dict[str, Any]]:
        if not path.exists():
            raise FileNotFoundError(f"Known faces index not found: {path}")
        with path.open("rb") as f:
            return pickle.load(f)

    def _embedding_from_crop(self, crop_bgr: np.ndarray) -> np.ndarray:
        crop_bgr = self._normalize_crop(crop_bgr)
        crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
        try:
            resp = DeepFace.represent(
                img_path=crop_rgb,
                model_name=self._model_name,
                detector_backend=self._detector_backend,
                enforce_detection=self._enforce_detection,
            )
        except Exception:
            # We already provide a face crop from the detector stage; skip inner detection as fallback.
            resp = DeepFace.represent(
                img_path=crop_rgb,
                model_name=self._model_name,
                detector_backend="skip",
                enforce_detection=False,
            )
        emb = resp[0].get("embedding") if isinstance(resp, list) else resp.get("embedding")
        if emb is None:
            raise RuntimeError("DeepFace returned no embedding")
        return np.asarray(emb, dtype=np.float32)

    @staticmethod
    def _normalize_crop(crop_bgr: np.ndarray) -> np.ndarray:
        if crop_bgr.size == 0:
            raise RuntimeError("Empty crop")

        if crop_bgr.ndim == 2:
            crop_bgr = cv2.cvtColor(crop_bgr, cv2.COLOR_GRAY2BGR)
        elif crop_bgr.ndim == 3 and crop_bgr.shape[2] == 4:
            crop_bgr = cv2.cvtColor(crop_bgr, cv2.COLOR_BGRA2BGR)
        elif crop_bgr.ndim != 3 or crop_bgr.shape[2] != 3:
            raise RuntimeError(f"Unsupported crop shape: {crop_bgr.shape}")

        h, w = crop_bgr.shape[:2]
        # DeepFace backbones are more stable when the face patch is not extremely tiny.
        min_side = min(h, w)
        if min_side < 64:
            scale = 64.0 / float(max(1, min_side))
            new_w = max(64, int(round(w * scale)))
            new_h = max(64, int(round(h * scale)))
            crop_bgr = cv2.resize(crop_bgr, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

        return crop_bgr

    def _match_student(self, embedding: np.ndarray) -> tuple[str | None, float | None, float | None]:
        best_student_id: str | None = None
        best_similarity = -1.0
        second_similarity = -1.0

        for student_id, payload in self._known_faces.items():
            known_embeddings = payload["embeddings"]
            similarity = self._cosine_similarity_to_known(embedding, known_embeddings)
            if similarity > best_similarity:
                second_similarity = best_similarity
                best_similarity = similarity
                best_student_id = student_id
            elif similarity > second_similarity:
                second_similarity = similarity

        if best_student_id is None:
            return None, None, None
        if best_similarity < self._similarity_threshold:
            return None, best_similarity, second_similarity if second_similarity >= 0 else None
        if second_similarity >= 0 and (best_similarity - second_similarity) < self._min_similarity_gap:
            return None, best_similarity, second_similarity
        return best_student_id, best_similarity, second_similarity if second_similarity >= 0 else None

    @staticmethod
    def _cosine_similarity_to_known(embedding: np.ndarray, known_embeddings: np.ndarray) -> float:
        emb_norm = embedding / (np.linalg.norm(embedding) + 1e-12)
        known_norms = known_embeddings / (np.linalg.norm(known_embeddings, axis=1, keepdims=True) + 1e-12)
        sims = known_norms @ emb_norm
        return float(np.max(sims)) if sims.size else -1.0

    @staticmethod
    def _cache_key(crop_bgr: np.ndarray) -> str:
        small = cv2.resize(crop_bgr, (64, 64), interpolation=cv2.INTER_AREA)
        digest = hashlib.sha1(small.tobytes()).hexdigest()
        return digest

    def _cache_put(self, key: str, result: RecognitionResult) -> None:
        now = time.monotonic()
        self._cache[key] = (now, result)
        if len(self._cache) <= self._cache_max_entries:
            return
        oldest_key = min(self._cache.items(), key=lambda item: item[1][0])[0]
        self._cache.pop(oldest_key, None)
