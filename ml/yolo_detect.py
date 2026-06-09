"""
Run YOLOv8 face detection on dataset images, crop faces, and record detection parameters/stats.

Weights: YOLOv8n-face (auto-downloaded to ml/weights/).
"""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path
import requests
import numpy as np
from PIL import Image
from ultralytics import YOLO

YOLO_FACE_URLS = [
    "https://github.com/akanametov/yolov8-face/releases/download/v0.0.0/yolov8n-face.pt",
    "https://github.com/lindevs/yolov8-face/releases/latest/download/yolov8n-face-lindevs.pt",
]
DEFAULT_WEIGHTS = Path(__file__).resolve().parent / "weights" / "yolov8n-face.pt"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="YOLO face detect + crop for training set.")
    p.add_argument("--source", type=Path, default=Path("datasets/lfw50/train"))
    p.add_argument("--out-dir", type=Path, default=Path("datasets/lfw50_yolo/train"))
    p.add_argument("--weights", type=Path, default=DEFAULT_WEIGHTS)
    p.add_argument("--conf", type=float, default=0.25, help="Confidence threshold.")
    p.add_argument("--iou", type=float, default=0.45, help="NMS IoU threshold.")
    p.add_argument("--imgsz", type=int, default=640, help="Inference image size.")
    p.add_argument("--max-det", type=int, default=1, help="Max detections per image.")
    p.add_argument("--padding", type=float, default=0.15, help="BBox padding ratio.")
    p.add_argument("--fallback-copy", action="store_true", default=True, help="Copy full image if no face.")
    return p.parse_args()


def ensure_weights(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        return path

    last_err: Exception | None = None
    for url in YOLO_FACE_URLS:
        try:
            print(f"Downloading YOLO weights: {url}")
            with requests.get(url, stream=True, timeout=120) as r:
                r.raise_for_status()
                with path.open("wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        if chunk:
                            f.write(chunk)
            return path
        except Exception as exc:
            last_err = exc
            print(f"  failed: {exc}")

    # Fallback: general YOLOv8n (ultralytics auto-download)
    print("Face weights unavailable; using yolov8n.pt (general detector)")
    return Path("yolov8n.pt")


def crop_face(
    image: Image.Image,
    box: tuple[float, float, float, float],
    padding: float,
) -> Image.Image:
    w, h = image.size
    x1, y1, x2, y2 = box
    bw, bh = x2 - x1, y2 - y1
    pad_w, pad_h = bw * padding, bh * padding
    x1 = max(0, int(x1 - pad_w))
    y1 = max(0, int(y1 - pad_h))
    x2 = min(w, int(x2 + pad_w))
    y2 = min(h, int(y2 + pad_h))
    if x2 <= x1 or y2 <= y1:
        return image
    return image.crop((x1, y1, x2, y2))


def collect_model_params(model: YOLO, args: argparse.Namespace) -> dict:
    summary = {}
    try:
        info_lines = []
        model.model.info(verbose=False)  # type: ignore[attr-defined]
        n_params = sum(p.numel() for p in model.model.parameters())  # type: ignore[attr-defined]
        summary["total_parameters"] = int(n_params)
    except Exception:
        summary["total_parameters"] = None

    return {
        "model_weights": str(args.weights.resolve()),
        "task": "detect",
        "inference": {
            "conf": args.conf,
            "iou": args.iou,
            "imgsz": args.imgsz,
            "max_det": args.max_det,
            "padding": args.padding,
        },
        "model_summary": summary,
        "class_names": getattr(model.model, "names", None) if hasattr(model, "model") else None,
    }


def main() -> None:
    args = parse_args()
    weights = ensure_weights(args.weights)
    model = YOLO(str(weights))

    yolo_params = collect_model_params(model, args)
    confidences: list[float] = []
    box_areas: list[float] = []
    stats = {
        "images_processed": 0,
        "faces_detected": 0,
        "fallback_copies": 0,
        "no_detection": 0,
    }

    args.out_dir.mkdir(parents=True, exist_ok=True)

    image_paths = sorted(args.source.rglob("*.jpg"))
    if not image_paths:
        raise FileNotFoundError(f"No .jpg under {args.source}")

    for src in image_paths:
        rel = src.relative_to(args.source)
        dest = args.out_dir / rel.parent / f"yolo_{src.name}"
        dest.parent.mkdir(parents=True, exist_ok=True)

        image = Image.open(src).convert("RGB")
        results = model.predict(
            source=np.array(image),
            conf=args.conf,
            iou=args.iou,
            imgsz=args.imgsz,
            max_det=args.max_det,
            verbose=False,
        )
        stats["images_processed"] += 1
        result = results[0]
        boxes = result.boxes

        if boxes is None or len(boxes) == 0:
            stats["no_detection"] += 1
            if args.fallback_copy:
                image.save(dest)
                stats["fallback_copies"] += 1
            continue

        # Largest face by area
        best_idx = 0
        best_area = 0.0
        for i, box in enumerate(boxes):
            xyxy = box.xyxy[0].tolist()
            area = (xyxy[2] - xyxy[0]) * (xyxy[3] - xyxy[1])
            if area > best_area:
                best_area = area
                best_idx = i

        box = boxes[best_idx]
        xyxy = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        confidences.append(conf)
        img_w, img_h = image.size
        box_areas.append(best_area / (img_w * img_h))

        cropped = crop_face(image, (xyxy[0], xyxy[1], xyxy[2], xyxy[3]), args.padding)
        cropped.save(dest)
        stats["faces_detected"] += 1

    detection_stats = {
        **stats,
        "detection_rate": stats["faces_detected"] / max(stats["images_processed"], 1),
        "confidence": {
            "mean": statistics.mean(confidences) if confidences else None,
            "median": statistics.median(confidences) if confidences else None,
            "min": min(confidences) if confidences else None,
            "max": max(confidences) if confidences else None,
            "stdev": statistics.stdev(confidences) if len(confidences) > 1 else None,
        },
        "box_area_ratio": {
            "mean": statistics.mean(box_areas) if box_areas else None,
            "median": statistics.median(box_areas) if box_areas else None,
        },
    }

    report = {
        "yolo_parameters": yolo_params,
        "detection_stats": detection_stats,
        "source_dir": str(args.source.resolve()),
        "output_dir": str(args.out_dir.resolve()),
    }

    report_dir = Path(__file__).resolve().parent / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "yolo_detection_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps(report, indent=2))
    print(f"\nReport saved -> {report_path}")


if __name__ == "__main__":
    main()
