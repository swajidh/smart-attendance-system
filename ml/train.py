"""
Train FaceAttendanceCNN on torchvision ImageFolder layout:

  <data_root>/train/<class_name>/*.jpg

Checkpoints go under ml/models/ by default (gitignored).
Run from repo root:  python -m ml.train --data-root ./ml/datasets
Or from ml/:        python train.py --data-root ./datasets
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from time import perf_counter

import torch
import torch.nn as nn
from tqdm import tqdm

if __package__:
    from .face_cnn import FaceAttendanceCNN
    from .data_utils import build_dataloaders
else:
    from face_cnn import FaceAttendanceCNN
    from data_utils import build_dataloaders


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train attendance face CNN.")
    p.add_argument(
        "--data-root",
        type=Path,
        default=Path("datasets"),
        help="Directory containing train/ subfolder (ImageFolder).",
    )
    p.add_argument("--epochs", type=int, default=30)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--weight-decay", type=float, default=1e-4)
    p.add_argument("--val-split", type=float, default=0.15)
    p.add_argument("--num-workers", type=int, default=0)
    p.add_argument(
        "--save-dir",
        type=Path,
        default=Path("models"),
        help="Directory for checkpoints (relative to cwd unless absolute).",
    )
    p.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    return p.parse_args()


@torch.no_grad()
def evaluate(model: nn.Module, loader: torch.utils.data.DataLoader, device: torch.device) -> tuple[float, float]:
    model.eval()
    criterion = nn.CrossEntropyLoss()
    total_loss = 0.0
    correct = 0
    total = 0
    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        logits = model(images)
        loss = criterion(logits, labels)
        total_loss += loss.item() * images.size(0)
        pred = logits.argmax(dim=1)
        correct += (pred == labels).sum().item()
        total += images.size(0)
    return total_loss / max(total, 1), correct / max(total, 1)


def main() -> None:
    args = parse_args()
    device = torch.device(args.device)
    args.save_dir.mkdir(parents=True, exist_ok=True)

    loader_train, loader_val, num_classes, class_names = build_dataloaders(
        args.data_root.resolve(),
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        val_split=args.val_split,
    )
    idx_to_class = dict(enumerate(class_names))

    model = FaceAttendanceCNN(num_classes=num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val = float("inf")
    t0 = perf_counter()

    for epoch in range(1, args.epochs + 1):
        model.train()
        running = 0.0
        n_seen = 0
        pbar = tqdm(loader_train, desc=f"epoch {epoch}/{args.epochs}", leave=False)
        for images, labels in pbar:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            running += loss.item() * images.size(0)
            n_seen += images.size(0)
            pbar.set_postfix(loss=f"{running / max(n_seen, 1):.4f}")

        scheduler.step()

        train_loss = running / max(n_seen, 1)
        msg = f"epoch {epoch} train_loss={train_loss:.4f} lr={scheduler.get_last_lr()[0]:.2e}"

        if loader_val is not None:
            val_loss, val_acc = evaluate(model, loader_val, device)
            msg += f" val_loss={val_loss:.4f} val_acc={val_acc:.4f}"
            if val_loss < best_val:
                best_val = val_loss
                ckpt_path = args.save_dir / "best.pt"
                _save_checkpoint(ckpt_path, model, epoch, idx_to_class, num_classes, val_loss, val_acc)
                msg += " (saved best)"
        else:
            ckpt_path = args.save_dir / "last.pt"
            _save_checkpoint(ckpt_path, model, epoch, idx_to_class, num_classes, train_loss, None)

        tqdm.write(msg)

    # Always save final
    final_path = args.save_dir / "last.pt"
    _save_checkpoint(final_path, model, args.epochs, idx_to_class, num_classes, train_loss, None)
    tqdm.write(f"done in {perf_counter() - t0:.1f}s — checkpoints in {args.save_dir.resolve()}")


def _save_checkpoint(
    path: Path,
    model: nn.Module,
    epoch: int,
    idx_to_class: dict[int, str],
    num_classes: int,
    loss: float,
    val_acc: float | None,
) -> None:
    payload = {
        "epoch": epoch,
        "model_state": model.state_dict(),
        "num_classes": num_classes,
        "idx_to_class": idx_to_class,
        "loss": loss,
        "val_acc": val_acc,
    }
    torch.save(payload, path)
    meta = path.with_suffix(".json")
    meta.write_text(
        json.dumps(
            {
                "epoch": epoch,
                "num_classes": num_classes,
                "classes": [idx_to_class[i] for i in range(num_classes)],
                "loss": loss,
                "val_acc": val_acc,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
