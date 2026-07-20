#!/usr/bin/env bash
# Download ML model files before first Docker build/run (saves cold-start time).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ML_DIR="$ROOT/ml"

mkdir -p "$ML_DIR"

LANDMARKER="$ML_DIR/face_landmarker.task"
if [[ ! -f "$LANDMARKER" ]]; then
  echo "Downloading MediaPipe face_landmarker.task..."
  curl -fsSL \
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" \
    -o "$LANDMARKER"
fi

YOLO="$ML_DIR/yolov8n.pt"
if [[ ! -f "$YOLO" ]]; then
  echo "Downloading YOLOv8n weights..."
  if command -v python3 >/dev/null 2>&1; then
    cd "$ROOT"
    python3 - <<'PY'
from pathlib import Path
from ultralytics import YOLO

dest = Path("ml/yolov8n.pt")
dest.parent.mkdir(parents=True, exist_ok=True)
model = YOLO("yolov8n.pt")
src = Path(getattr(model, "ckpt_path", "yolov8n.pt"))
if src.exists() and src.resolve() != dest.resolve():
    dest.write_bytes(src.read_bytes())
print("Saved", dest)
PY
  else
    echo "Install Python + ultralytics, or copy yolov8n.pt into ml/ manually."
    exit 1
  fi
fi

echo "ML models ready in $ML_DIR"
