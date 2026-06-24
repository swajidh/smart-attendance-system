#!/usr/bin/env python3
"""
collect_cctv_samples.py — CCTV / webcam sample collection utility
WBS 16.5

Captures labeled face-image samples from a CCTV feed or webcam for use in:
  - Face enrollment batch upload
  - Model training dataset augmentation
  - System accuracy validation

Usage:
    # Interactive mode (webcam)
    python scripts/collect_cctv_samples.py --student-id STU-001 --name "Ali Hamza"

    # CCTV stream (RTSP)
    python scripts/collect_cctv_samples.py \
        --student-id STU-002 --name "Sara Khan" \
        --source "rtsp://admin:pass@192.168.1.100:554/stream"

    # Batch from a video file
    python scripts/collect_cctv_samples.py \
        --student-id STU-003 --name "Usman Malik" \
        --source lecture_recording.mp4 \
        --every-n-frames 30

Options:
    --student-id      Unique student identifier (used in output filenames)
    --name            Student full name (metadata only)
    --source          Camera index (0), RTSP URL, or video file path (default: 0)
    --output-dir      Where to save samples (default: ./data/samples/<student_id>/)
    --count           Number of samples to capture (default: 50)
    --every-n-frames  Capture 1 frame every N frames from video (default: 15)
    --quality         JPEG quality 1-100 (default: 95)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import cv2
except ImportError:
    print("[collect_cctv_samples] ERROR: opencv-python is required.")
    print("  Install with: pip install opencv-python")
    sys.exit(1)


FACE_CASCADE = None


def _load_face_cascade():
    """Load OpenCV Haar cascade for face detection (no MediaPipe needed)."""
    global FACE_CASCADE
    if FACE_CASCADE is not None:
        return FACE_CASCADE
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    FACE_CASCADE = cv2.CascadeClassifier(cascade_path)
    if FACE_CASCADE.empty():
        raise RuntimeError(f"Failed to load face cascade from {cascade_path}")
    return FACE_CASCADE


def detect_face(frame) -> bool:
    """Return True if at least one face is detected in the frame."""
    cascade = _load_face_cascade()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    return len(faces) > 0


def collect_samples(
    student_id: str,
    name: str,
    source,
    output_dir: Path,
    count: int,
    every_n: int,
    quality: int,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    # Write metadata
    meta = {
        "student_id": student_id,
        "name": name,
        "source": str(source),
        "collected_at": datetime.now().isoformat(),
        "target_count": count,
    }
    (output_dir / "metadata.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )

    # Open capture
    src = int(source) if str(source).isdigit() else str(source)
    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        print(f"[collect_cctv_samples] ERROR: Cannot open source: {source}")
        sys.exit(1)

    print(f"[collect_cctv_samples] Starting capture for: {name} ({student_id})")
    print(f"  Output directory : {output_dir}")
    print(f"  Target samples   : {count}")
    print(f"  Frame interval   : every {every_n} frames")
    print("  Press 'q' to quit early.\n")

    saved = 0
    frame_idx = 0

    while saved < count:
        ret, frame = cap.read()
        if not ret:
            print("[collect_cctv_samples] Stream ended or no more frames.")
            break

        frame_idx += 1

        # Show live preview for webcam sources
        if str(source).isdigit():
            preview = frame.copy()
            cv2.putText(
                preview,
                f"Captured: {saved}/{count}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2,
            )
            cv2.imshow("SAS — Sample Collector (press q to quit)", preview)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                print("[collect_cctv_samples] User quit.")
                break

        if frame_idx % every_n != 0:
            continue

        # Face quality gate
        if not detect_face(frame):
            continue

        filename = output_dir / f"{student_id}_{saved + 1:04d}.jpg"
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        cv2.imwrite(str(filename), frame, encode_params)
        saved += 1

        if saved % 10 == 0 or saved == count:
            print(f"  Saved {saved}/{count} samples…")

    cap.release()
    cv2.destroyAllWindows()

    # Update metadata with actual count
    meta["actual_count"] = saved
    meta["completed"] = saved >= count
    (output_dir / "metadata.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )

    print(f"\n[collect_cctv_samples] Done. Saved {saved} sample(s) to {output_dir}")
    if saved < count:
        print(f"  Warning: only {saved}/{count} samples collected.")


def main():
    parser = argparse.ArgumentParser(
        description="Smart Attendance System — CCTV sample collector"
    )
    parser.add_argument("--student-id", required=True, help="Student ID (e.g. STU-001)")
    parser.add_argument("--name", required=True, help="Student full name")
    parser.add_argument(
        "--source", default="0",
        help="Camera index, RTSP URL, or video file path (default: 0 = webcam)"
    )
    parser.add_argument(
        "--output-dir", default=None,
        help="Output directory (default: ./data/samples/<student_id>/)"
    )
    parser.add_argument("--count", type=int, default=50, help="Number of samples to capture")
    parser.add_argument("--every-n-frames", type=int, default=15, dest="every_n")
    parser.add_argument("--quality", type=int, default=95)
    args = parser.parse_args()

    if args.output_dir:
        out = Path(args.output_dir)
    else:
        out = Path(__file__).parent.parent / "data" / "samples" / args.student_id

    collect_samples(
        student_id=args.student_id,
        name=args.name,
        source=args.source,
        output_dir=out,
        count=args.count,
        every_n=args.every_n,
        quality=args.quality,
    )


if __name__ == "__main__":
    main()
