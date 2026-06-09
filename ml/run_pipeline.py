"""
End-to-end: download 50 LFW identities -> YOLO face crop -> train CNN -> write combined report.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from time import perf_counter

ML_DIR = Path(__file__).resolve().parent


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="LFW50 + YOLO + CNN training pipeline.")
    p.add_argument("--data-root", type=Path, default=ML_DIR / "datasets" / "lfw50")
    p.add_argument("--yolo-out", type=Path, default=ML_DIR / "datasets" / "lfw50_yolo")
    p.add_argument("--num-people", type=int, default=50)
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--yolo-conf", type=float, default=0.25)
    p.add_argument("--yolo-iou", type=float, default=0.45)
    p.add_argument("--yolo-imgsz", type=int, default=640)
    p.add_argument("--skip-download", action="store_true")
    p.add_argument("--skip-yolo", action="store_true")
    p.add_argument("--skip-train", action="store_true")
    return p.parse_args()


def run_script(name: str, extra: list[str] | None = None) -> None:
    script = ML_DIR / name
    cmd = [sys.executable, str(script)] + (extra or [])
    print(f"\n>>> {' '.join(cmd)}")
    subprocess.run(cmd, cwd=ML_DIR, check=True)


def main() -> None:
    args = parse_args()
    t0 = perf_counter()

    if not args.skip_download:
        run_script(
            "download_lfw.py",
            [
                "--out-dir",
                str(args.data_root),
                "--num-people",
                str(args.num_people),
            ],
        )

    if not args.skip_yolo:
        run_script(
            "yolo_detect.py",
            [
                "--source",
                str(args.data_root / "train"),
                "--out-dir",
                str(args.yolo_out / "train"),
                "--conf",
                str(args.yolo_conf),
                "--iou",
                str(args.yolo_iou),
                "--imgsz",
                str(args.yolo_imgsz),
            ],
        )

    train_data = args.yolo_out
    save_dir = ML_DIR / "models" / "lfw50_cnn"

    if not args.skip_train:
        run_script(
            "train.py",
            [
                "--data-root",
                str(train_data),
                "--epochs",
                str(args.epochs),
                "--batch-size",
                str(args.batch_size),
                "--save-dir",
                str(save_dir),
            ],
        )

    combined: dict = {
        "pipeline_seconds": round(perf_counter() - t0, 1),
        "num_people": args.num_people,
        "data_root": str(args.data_root),
        "yolo_output": str(args.yolo_out),
        "cnn_checkpoint_dir": str(save_dir),
        "training_epochs": args.epochs,
    }

    yolo_report = ML_DIR / "reports" / "yolo_detection_report.json"
    if yolo_report.is_file():
        combined["yolo"] = json.loads(yolo_report.read_text(encoding="utf-8"))

    best_meta = save_dir / "best.json"
    if best_meta.is_file():
        combined["cnn_training"] = json.loads(best_meta.read_text(encoding="utf-8"))

    report_path = ML_DIR / "reports" / "pipeline_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(combined, indent=2), encoding="utf-8")
    print(f"\nPipeline complete in {combined['pipeline_seconds']}s")
    print(f"Combined report -> {report_path}")


if __name__ == "__main__":
    main()
