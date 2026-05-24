"""Run inference with a saved FaceAttendanceCNN checkpoint."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from PIL import Image

if __package__:
    from .face_cnn import FaceAttendanceCNN
    from .data_utils import eval_transforms
else:
    from face_cnn import FaceAttendanceCNN
    from data_utils import eval_transforms


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Classify a face image with a trained checkpoint.")
    p.add_argument("--checkpoint", type=Path, required=True, help="Path to .pt from train.py")
    p.add_argument("--image", type=Path, required=True)
    p.add_argument("--top-k", type=int, default=5)
    p.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    device = torch.device(args.device)

    try:
        ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
    except TypeError:
        ckpt = torch.load(args.checkpoint, map_location=device)
    num_classes = int(ckpt["num_classes"])
    idx_to_class = {int(k): v for k, v in ckpt["idx_to_class"].items()}

    model = FaceAttendanceCNN(num_classes=num_classes).to(device)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    image = Image.open(args.image).convert("RGB")
    x = eval_transforms()(image).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    topk = min(args.top_k, num_classes)
    values, indices = torch.topk(probs, k=topk)
    out = [
        {"rank": i + 1, "class": idx_to_class[int(idx)], "confidence": float(values[i])}
        for i in range(topk)
    ]
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
