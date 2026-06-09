"""
Build a 50-person face dataset for training.

Primary: sklearn LFW fetch (Figshare mirror).
Fallback: direct download of lfw.tgz from UMass / alternate mirrors.
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
import tarfile
from collections import defaultdict
from pathlib import Path

import numpy as np
import requests
from PIL import Image

LFW_MIRRORS = [
    "http://vis-www.cs.umass.edu/lfw/lfw.tgz",
    "https://ndownloader.figshare.com/files/5976018",  # deep funneled (different layout)
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Download LFW and sample N identities.")
    p.add_argument("--out-dir", type=Path, default=Path("datasets/lfw50"))
    p.add_argument("--num-people", type=int, default=50)
    p.add_argument("--min-images", type=int, default=5, help="Min faces per identity.")
    p.add_argument("--max-images-per-person", type=int, default=30)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--method", choices=["auto", "sklearn", "tgz"], default="auto")
    return p.parse_args()


def build_from_sklearn(
    out_dir: Path,
    num_people: int,
    min_images: int,
    max_per_person: int,
    seed: int,
) -> dict:
    from sklearn.datasets import fetch_lfw_people

    print("Fetching LFW via scikit-learn (downloads ~200 MB on first run)...")
    lfw = fetch_lfw_people(min_faces_per_person=min_images, color=True, resize=1.0)

    by_person: dict[int, list[np.ndarray]] = defaultdict(list)
    for idx, target in enumerate(lfw.target):
        by_person[int(target)].append(lfw.images[idx])

    eligible = [pid for pid, imgs in by_person.items() if len(imgs) >= min_images]
    if len(eligible) < num_people:
        raise RuntimeError(f"Only {len(eligible)} people meet min_images={min_images}")

    rng = random.Random(seed)
    selected = rng.sample(eligible, num_people)
    train_dir = out_dir / "train"
    train_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict = {"identities": [], "total_images": 0, "method": "sklearn"}

    for pid in sorted(selected):
        name = f"person_{pid:04d}"
        dest = train_dir / name
        dest.mkdir(parents=True, exist_ok=True)
        imgs = by_person[pid][:]
        rng.shuffle(imgs)
        for i, arr in enumerate(imgs[:max_per_person]):
            img = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))
            img.save(dest / f"{i:03d}.jpg")
        count = min(len(imgs), max_per_person)
        manifest["identities"].append({"id": name, "person_index": pid, "count": count})
        manifest["total_images"] += count

    return manifest


def _download_file(url: str, dest: Path, timeout: int = 120) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=timeout) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                if chunk:
                    f.write(chunk)


def download_lfw_tgz(raw_dir: Path) -> Path:
    raw_dir.mkdir(parents=True, exist_ok=True)
    extract_root = raw_dir / "lfw"
    if extract_root.is_dir() and any(extract_root.iterdir()):
        return extract_root

    tgz_path = raw_dir / "lfw.tgz"
    if not tgz_path.is_file():
        last_err: Exception | None = None
        for url in LFW_MIRRORS:
            try:
                print(f"Downloading {url}")
                _download_file(url, tgz_path)
                break
            except Exception as exc:
                last_err = exc
                print(f"  failed: {exc}")
        else:
            raise RuntimeError(f"All LFW mirrors failed: {last_err}") from last_err

    print("Extracting...")
    with tarfile.open(tgz_path, "r:gz") as tar:
        tar.extractall(path=raw_dir, filter="data")
    return extract_root


def build_from_tgz(
    out_dir: Path,
    num_people: int,
    min_images: int,
    max_per_person: int,
    seed: int,
) -> dict:
    lfw_root = download_lfw_tgz(out_dir / "raw")
    people_dirs = [p for p in lfw_root.iterdir() if p.is_dir()]
    eligible = [p for p in people_dirs if len(list(p.glob("*.jpg"))) >= min_images]
    if len(eligible) < num_people:
        raise RuntimeError(f"Only {len(eligible)} people have>={min_images} images")

    rng = random.Random(seed)
    selected = rng.sample(eligible, num_people)
    train_dir = out_dir / "train"
    train_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict = {"identities": [], "total_images": 0, "method": "tgz"}

    for person_dir in sorted(selected, key=lambda p: p.name):
        images = sorted(person_dir.glob("*.jpg"))
        rng.shuffle(images)
        picked = images[:max_per_person]
        dest = train_dir / person_dir.name.replace(" ", "_")
        dest.mkdir(parents=True, exist_ok=True)
        for src in picked:
            shutil.copy2(src, dest / src.name)
        manifest["identities"].append({"id": dest.name, "source": person_dir.name, "count": len(picked)})
        manifest["total_images"] += len(picked)

    return manifest


def main() -> None:
    args = parse_args()
    train_dir = args.out_dir / "train"

    if train_dir.is_dir() and len([d for d in train_dir.iterdir() if d.is_dir()]) >= args.num_people:
        print(f"Train set already exists: {train_dir}")
        return

    manifest: dict
    if args.method in ("auto", "sklearn"):
        try:
            manifest = build_from_sklearn(
                args.out_dir, args.num_people, args.min_images, args.max_images_per_person, args.seed
            )
        except Exception as exc:
            if args.method == "sklearn":
                raise
            print(f"sklearn download failed ({exc}); trying tgz mirrors...")
            manifest = build_from_tgz(
                args.out_dir, args.num_people, args.min_images, args.max_images_per_person, args.seed
            )
    else:
        manifest = build_from_tgz(
            args.out_dir, args.num_people, args.min_images, args.max_images_per_person, args.seed
        )

    manifest.update(
        {
            "dataset": "LFW",
            "num_people": args.num_people,
            "min_images": args.min_images,
            "seed": args.seed,
            "train_dir": str(train_dir.resolve()),
        }
    )
    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Built {manifest['total_images']} images for {len(manifest['identities'])} people -> {train_dir}")


if __name__ == "__main__":
    main()
