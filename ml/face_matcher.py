"""
Face matcher — cosine similarity search over enrolled embeddings.

Usage:
    matcher = FaceMatcher(threshold=0.55)
    student_id, confidence = matcher.match(probe_embedding, gallery)
    # gallery: { student_id: [embedding_list] }   (list from DB)
"""

from __future__ import annotations
import numpy as np
from typing import Optional

DEFAULT_THRESHOLD = 0.45  # cosine similarity cutoff (0–1); higher = stricter
SINGLE_GALLERY_THRESHOLD = 0.30  # relaxed when only one enrolled profile


class FaceMatcher:
    def __init__(self, threshold: float = DEFAULT_THRESHOLD):
        self.threshold = threshold

    def match(
        self,
        probe: list[float],
        gallery: dict[str, list[float]],
    ) -> tuple[Optional[str], float]:
        """
        Find the closest identity in the gallery.

        Args:
            probe:   Embedding vector for the detected face (unit-normalized).
            gallery: Dict mapping student_id → stored embedding list.

        Returns:
            (student_id, confidence) if similarity >= threshold, else (None, 0.0).
        """
        if not gallery:
            return None, 0.0

        probe_arr = np.array(probe, dtype=np.float32)
        probe_arr = probe_arr / (np.linalg.norm(probe_arr) + 1e-8)

        best_id: Optional[str] = None
        best_sim: float = -1.0

        for student_id, stored_emb in gallery.items():
            if stored_emb is None:
                continue
            ref = np.array(stored_emb, dtype=np.float32)
            ref = ref / (np.linalg.norm(ref) + 1e-8)
            sim = float(np.dot(probe_arr, ref))
            if sim > best_sim:
                best_sim = sim
                best_id = student_id

        effective_threshold = self.threshold
        if len(gallery) == 1:
            effective_threshold = min(self.threshold, SINGLE_GALLERY_THRESHOLD)

        if best_sim >= effective_threshold:
            return best_id, round(best_sim, 4)
        return None, round(best_sim, 4)

    def batch_match(
        self,
        probes: list[list[float]],
        gallery: dict[str, list[float]],
    ) -> list[tuple[Optional[str], float]]:
        """Match multiple probe embeddings against the same gallery."""
        return [self.match(p, gallery) for p in probes]
