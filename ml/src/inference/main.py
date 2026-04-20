from __future__ import annotations

import argparse
from pathlib import Path

from camera_loop import CameraLoopConfig, run_camera_loop


def parse_args() -> CameraLoopConfig:
    parser = argparse.ArgumentParser(description="Phase-4 real-time recognition + attendance loop.")
    parser.add_argument("--camera-index", type=int, default=0)
    parser.add_argument("--display", action="store_true")
    parser.add_argument("--inference-every-n-frames", type=int, default=1)
    parser.add_argument("--max-faces-per-frame", type=int, default=5)
    parser.add_argument("--yolo-model", default="yolov8n-face.pt")
    parser.add_argument("--yolo-device", default="cpu")
    parser.add_argument("--known-faces", default="ml/src/config/known_faces.pkl")
    parser.add_argument("--model-name", default="Facenet512")
    parser.add_argument("--detector-backend", default="skip")
    parser.add_argument("--enforce-detection", action="store_true")
    parser.add_argument("--similarity-threshold", type=float, default=0.60)
    parser.add_argument("--min-similarity-gap", type=float, default=0.03)
    parser.add_argument("--backend-url", default="http://localhost:8000/api/v1/mark-attendance")
    parser.add_argument("--request-timeout-seconds", type=float, default=5.0)
    parser.add_argument("--client-cooldown-minutes", type=float, default=5.0)
    parser.add_argument("--unknown-label", default="Unknown")
    parser.add_argument("--liveness-enabled", action="store_true")
    parser.add_argument("--frame-scale", type=float, default=1.0)
    parser.add_argument("--metrics-log-interval-seconds", type=float, default=10.0)
    parser.add_argument("--unknown-save-enabled", action="store_true")
    parser.add_argument("--unknown-save-dir", default="data/interim/unknown_faces")
    parser.add_argument("--unknown-save-cooldown-seconds", type=float, default=10.0)
    parser.add_argument("--recognition-cooldown-seconds", type=float, default=0.8)
    parser.add_argument("--adaptive-recognition-cooldown", action="store_true")
    parser.add_argument("--multi-face-recognition-cooldown-seconds", type=float, default=0.25)
    args = parser.parse_args()

    known_faces_path = Path(str(args.known_faces))
    if not known_faces_path.exists():
        raise FileNotFoundError(
            f"Known-faces index not found: {known_faces_path}. "
            "Run encoder first to generate known_faces.pkl."
        )

    return CameraLoopConfig(
        camera_index=args.camera_index,
        display=bool(args.display),
        inference_every_n_frames=max(1, int(args.inference_every_n_frames)),
        max_faces_per_frame=max(1, int(args.max_faces_per_frame)),
        yolo_model_path=str(args.yolo_model),
        yolo_device=str(args.yolo_device),
        known_faces_path=str(args.known_faces),
        model_name=str(args.model_name),
        detector_backend=str(args.detector_backend),
        enforce_detection=bool(args.enforce_detection),
        similarity_threshold=float(args.similarity_threshold),
        min_similarity_gap=float(args.min_similarity_gap),
        backend_url=str(args.backend_url),
        request_timeout_seconds=float(args.request_timeout_seconds),
        client_cooldown_seconds=float(args.client_cooldown_minutes) * 60.0,
        unknown_label=str(args.unknown_label),
        liveness_enabled=bool(args.liveness_enabled),
        frame_scale=float(args.frame_scale),
        metrics_log_interval_seconds=max(1.0, float(args.metrics_log_interval_seconds)),
        unknown_save_enabled=bool(args.unknown_save_enabled),
        unknown_save_dir=str(args.unknown_save_dir),
        unknown_save_cooldown_seconds=max(1.0, float(args.unknown_save_cooldown_seconds)),
        recognition_cooldown_seconds=max(0.0, float(args.recognition_cooldown_seconds)),
        adaptive_recognition_cooldown=bool(args.adaptive_recognition_cooldown),
        multi_face_recognition_cooldown_seconds=max(
            0.0, float(args.multi_face_recognition_cooldown_seconds)
        ),
    )


def main() -> None:
    cfg = parse_args()
    run_camera_loop(cfg)


if __name__ == "__main__":
    main()
