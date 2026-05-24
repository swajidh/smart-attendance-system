from __future__ import annotations

from pathlib import Path

import torch
from torch.utils.data import DataLoader
from torchvision import datasets, transforms


IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
INPUT_SIZE = 112


def train_transforms() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def eval_transforms() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def build_dataloaders(
    data_root: Path,
    batch_size: int,
    num_workers: int = 0,
    val_split: float = 0.15,
    seed: int = 42,
) -> tuple[DataLoader, DataLoader | None, int, list[str]]:
    """
    Expects `data_root/train/<class_name>/*.jpg` (torchvision ImageFolder).

    If val_split > 0, splits each class stratified by file list (deterministic with seed).
    """
    train_dir = data_root / "train"
    if not train_dir.is_dir():
        raise FileNotFoundError(
            f"Missing {train_dir}. Create data/train/<person_id>/*.jpg (or symlink to your dataset)."
        )

    full = datasets.ImageFolder(str(train_dir), transform=train_transforms())
    num_classes = len(full.classes)
    if num_classes < 2:
        raise ValueError("Need at least 2 classes (folders) under train/ for classification.")

    if val_split <= 0:
        loader_train = DataLoader(
            full,
            batch_size=batch_size,
            shuffle=True,
            num_workers=num_workers,
            pin_memory=torch.cuda.is_available(),
        )
        return loader_train, None, num_classes, full.classes

    g = torch.Generator().manual_seed(seed)
    n = len(full)
    if n < 2:
        raise ValueError("Need at least 2 images under train/ to use val_split.")
    indices = torch.randperm(n, generator=g).tolist()
    n_val = min(max(1, int(n * val_split)), n - 1)
    val_idx, train_idx = set(indices[:n_val]), indices[n_val:]

    train_subset = torch.utils.data.Subset(full, train_idx)
    val_subset = torch.utils.data.Subset(
        datasets.ImageFolder(str(train_dir), transform=eval_transforms()),
        list(val_idx),
    )

    loader_train = DataLoader(
        train_subset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    loader_val = DataLoader(
        val_subset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    return loader_train, loader_val, num_classes, full.classes
