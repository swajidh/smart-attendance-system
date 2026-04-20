from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import os

import cv2
import numpy as np

from attendance_client import AttendanceClient
from detector import FaceDetection, FaceDetector
from liveness import FaceBox, LivenessChecker, NoOpLivenessChecker, log_liveness_decision
from recognizer import FaceRecognizer


@dataclass(frozen=True)
class CameraLoopConfig:
    camera_index: int
    display: bool
    inference_every_n_frames: int
    max_faces_per_frame: int
    yolo_model_path: str
    yolo_device: str
    known_faces_path: str
    model_name: str
    detector_backend: str
    enforce_detection: bool
    similarity_threshold: float
    min_similarity_gap: float
    backend_url: str
    request_timeout_seconds: float
    client_cooldown_seconds: float
    unknown_label: str
    liveness_enabled: bool
    frame_scale: float
    metrics_log_interval_seconds: float
    unknown_save_enabled: bool
    unknown_save_dir: str
    unknown_save_cooldown_seconds: float
    recognition_cooldown_seconds: float
    adaptive_recognition_cooldown: bool
    multi_face_recognition_cooldown_seconds: float
    window_name: str = "Smart Attendance - Phase 3"


def _draw_overlay(frame, entries: list[tuple[FaceDetection, str, tuple[int, int, int]]]) -> None:
    for detection, label, color in entries:
        cv2.rectangle(
            frame,
            (detection.x1, detection.y1),
            (detection.x2, detection.y2),
            color,
            2,
        )
        cv2.putText(
            frame,
            label,
            (detection.x1, max(20, detection.y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1,
            cv2.LINE_AA,
        )


def run_camera_loop(cfg: CameraLoopConfig) -> None:
    detector = FaceDetector(yolo_model_path=cfg.yolo_model_path, yolo_device=cfg.yolo_device)
    recognizer = FaceRecognizer(
        known_faces_path=cfg.known_faces_path,
        model_name=cfg.model_name,
        detector_backend=cfg.detector_backend,
        enforce_detection=cfg.enforce_detection,
        similarity_threshold=cfg.similarity_threshold,
        min_similarity_gap=cfg.min_similarity_gap,
        unknown_label=cfg.unknown_label,
    )
    attendance_client = AttendanceClient(base_url=cfg.backend_url, timeout_seconds=cfg.request_timeout_seconds)
    liveness_checker: LivenessChecker = NoOpLivenessChecker()

    cap = _open_camera(cfg.camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open camera index {cfg.camera_index}")

    frame_idx = 0
    last_detections: list[FaceDetection] = []
    last_overlay_entries: list[tuple[FaceDetection, str, tuple[int, int, int]]] = []
    last_posted_monotonic: dict[str, float] = {}
    last_recognition_by_face_key: dict[tuple[int, int, int, int], tuple[float, object]] = {}
    last_unknown_saved_monotonic: float | None = None
    last_metrics_log_ts = time.monotonic()
    processed_frames = 0
    total_detect_ms = 0.0
    total_recognize_ms = 0.0
    total_post_ms = 0.0

    try:
        while True:
            start_ts = time.perf_counter()
            ok, frame = cap.read()
            if not ok:
                break

            if (frame_idx % cfg.inference_every_n_frames) == 0:
                detection_frame, scale_x, scale_y = _scaled_frame(frame, cfg.frame_scale)
                detect_start = time.perf_counter()
                detections = detector.detect(detection_frame)
                total_detect_ms += (time.perf_counter() - detect_start) * 1000.0
                detections = _rescale_detections(detections, frame.shape[1], frame.shape[0], scale_x, scale_y)
                last_detections = detections[: cfg.max_faces_per_frame]
                recognition_cooldown_seconds = cfg.recognition_cooldown_seconds
                if cfg.adaptive_recognition_cooldown and len(last_detections) > 1:
                    recognition_cooldown_seconds = min(
                        recognition_cooldown_seconds,
                        cfg.multi_face_recognition_cooldown_seconds,
                    )
                current_entries: list[tuple[FaceDetection, str, tuple[int, int, int]]] = []
                for detection in last_detections:
                    crop = frame[detection.y1 : detection.y2, detection.x1 : detection.x2]
                    if crop.size == 0:
                        continue
                    now_mono = time.monotonic()
                    face_key = _face_key(detection)
                    cached_face = last_recognition_by_face_key.get(face_key)
                    if cached_face is not None and (now_mono - cached_face[0]) < recognition_cooldown_seconds:
                        result = cached_face[1]
                    else:
                        recognize_start = time.perf_counter()
                        result = recognizer.recognize_crop(crop)
                        total_recognize_ms += (time.perf_counter() - recognize_start) * 1000.0
                        last_recognition_by_face_key[face_key] = (now_mono, result)
                    current_entries.append((detection, result.label, result.color_bgr))

                    if result.student_id is not None:
                        # Phase-5 hook: liveness decision gate before attendance posting.
                        if cfg.liveness_enabled:
                            liveness_result = liveness_checker.check(
                                frame=frame,
                                bbox=FaceBox(
                                    x1=detection.x1,
                                    y1=detection.y1,
                                    x2=detection.x2,
                                    y2=detection.y2,
                                ),
                                student_id=result.student_id,
                            )
                            log_liveness_decision(
                                student_id=result.student_id,
                                bbox=FaceBox(
                                    x1=detection.x1,
                                    y1=detection.y1,
                                    x2=detection.x2,
                                    y2=detection.y2,
                                ),
                                result=liveness_result,
                            )
                            if liveness_result.decision != "allow":
                                continue

                        last_ts = last_posted_monotonic.get(result.student_id)
                        if last_ts is None or (now_mono - last_ts) >= cfg.client_cooldown_seconds:
                            post_start = time.perf_counter()
                            payload = attendance_client.post_mark_attendance(
                                student_id=result.student_id,
                                marked_at=datetime.now(timezone.utc),
                            )
                            total_post_ms += (time.perf_counter() - post_start) * 1000.0
                            if payload is not None and payload.get("success") is True:
                                last_posted_monotonic[result.student_id] = now_mono
                                already_marked = payload.get("data", {}).get("already_marked")
                                if already_marked:
                                    print(f"Attendance already marked for {result.student_id}", flush=True)
                                else:
                                    print(f"Attendance marked for {result.student_id}", flush=True)
                    elif cfg.unknown_save_enabled:
                        now_mono = time.monotonic()
                        if (
                            last_unknown_saved_monotonic is None
                            or (now_mono - last_unknown_saved_monotonic) >= cfg.unknown_save_cooldown_seconds
                        ):
                            _save_unknown_crop(crop_bgr=crop, save_dir=Path(cfg.unknown_save_dir))
                            last_unknown_saved_monotonic = now_mono
                last_overlay_entries = current_entries
                _prune_face_cache(last_recognition_by_face_key, now_monotonic=time.monotonic(), ttl_seconds=2.0)
                processed_frames += 1

            if cfg.display:
                _draw_overlay(frame, last_overlay_entries)
                if not last_overlay_entries:
                    cv2.putText(
                        frame,
                        "No face detected",
                        (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8,
                        (255, 255, 255),
                        2,
                        cv2.LINE_AA,
                    )

                fps = 1.0 / max(1e-6, (time.perf_counter() - start_ts))
                cv2.putText(
                    frame,
                    f"FPS: {fps:.1f} | detector={detector.mode} | n={len(last_overlay_entries)} | scale={cfg.frame_scale:.2f}",
                    (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2,
                    cv2.LINE_AA,
                )
                cv2.imshow(cfg.window_name, frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            now_metrics = time.monotonic()
            if (now_metrics - last_metrics_log_ts) >= cfg.metrics_log_interval_seconds and processed_frames > 0:
                avg_detect = total_detect_ms / processed_frames
                avg_recognize = total_recognize_ms / processed_frames
                avg_post = total_post_ms / max(1, len(last_posted_monotonic))
                print(
                    f"[metrics] frames={processed_frames} avg_detect_ms={avg_detect:.2f} "
                    f"avg_recognize_ms={avg_recognize:.2f} avg_post_ms={avg_post:.2f}",
                    flush=True,
                )
                last_metrics_log_ts = now_metrics

            frame_idx += 1
    finally:
        cap.release()
        if cfg.display:
            cv2.destroyAllWindows()


def _scaled_frame(frame: np.ndarray, frame_scale: float) -> tuple[np.ndarray, float, float]:
    frame_scale = min(1.0, max(0.1, frame_scale))
    if frame_scale == 1.0:
        return frame, 1.0, 1.0
    h, w = frame.shape[:2]
    new_w = max(1, int(w * frame_scale))
    new_h = max(1, int(h * frame_scale))
    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
    scale_x = w / float(new_w)
    scale_y = h / float(new_h)
    return resized, scale_x, scale_y


def _rescale_detections(
    detections: list[FaceDetection],
    original_w: int,
    original_h: int,
    scale_x: float,
    scale_y: float,
) -> list[FaceDetection]:
    if scale_x == 1.0 and scale_y == 1.0:
        return detections
    out: list[FaceDetection] = []
    for det in detections:
        x1 = max(0, min(original_w - 1, int(det.x1 * scale_x)))
        y1 = max(0, min(original_h - 1, int(det.y1 * scale_y)))
        x2 = max(0, min(original_w - 1, int(det.x2 * scale_x)))
        y2 = max(0, min(original_h - 1, int(det.y2 * scale_y)))
        if x2 <= x1 or y2 <= y1:
            continue
        out.append(FaceDetection(x1=x1, y1=y1, x2=x2, y2=y2, confidence=det.confidence))
    return out


def _save_unknown_crop(*, crop_bgr: np.ndarray, save_dir: Path) -> None:
    save_dir.mkdir(parents=True, exist_ok=True)
    date_dir = save_dir / datetime.now(timezone.utc).date().isoformat()
    date_dir.mkdir(parents=True, exist_ok=True)
    filename = f"unknown_{int(time.time() * 1000)}.jpg"
    cv2.imwrite(str(date_dir / filename), crop_bgr)


def _face_key(det: FaceDetection) -> tuple[int, int, int, int]:
    # Quantize bbox so tiny jitter still maps to the same face key.
    bucket = 16
    return (
        det.x1 // bucket,
        det.y1 // bucket,
        det.x2 // bucket,
        det.y2 // bucket,
    )


def _prune_face_cache(
    cache: dict[tuple[int, int, int, int], tuple[float, object]],
    *,
    now_monotonic: float,
    ttl_seconds: float,
) -> None:
    stale_keys = [k for k, (ts, _) in cache.items() if (now_monotonic - ts) > ttl_seconds]
    for key in stale_keys:
        cache.pop(key, None)


def _open_camera(camera_index: int) -> cv2.VideoCapture:
    # Prefer DirectShow on Windows because MSMF can intermittently fail with
    # "can't grab frame" on some webcams/drivers.
    if os.name == "nt":
        cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
        if cap.isOpened():
            return cap
        cap.release()
    return cv2.VideoCapture(camera_index)
