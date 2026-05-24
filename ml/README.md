# ML — face attendance CNN

PyTorch CNN for **cropped face images** (one identity per folder). Pair with a face detector in production; this module only classifies fixed-size RGB crops.

## Layout

```
<data-root>/train/<student_or_id>/*.jpg
```

## Setup

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Train

From `ml/`:

```bash
python train.py --data-root ./datasets --epochs 30 --save-dir ./models
```

From repo root:

```bash
python -m ml.train --data-root ./ml/datasets --save-dir ./ml/models
```

## Infer

```bash
python infer.py --checkpoint ./models/best.pt --image path/to/face.jpg
```
