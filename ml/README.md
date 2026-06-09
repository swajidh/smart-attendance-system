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

## LFW 50-person experiment (download + YOLO + train)

Downloads [LFW](http://vis-www.cs.umass.edu/lfw/), samples **50 random identities**, runs **YOLOv8n-face** to crop faces, trains the CNN, and writes reports under `ml/reports/`.

```bash
cd ml
pip install -r requirements.txt
python run_pipeline.py
```

Reports:

- `reports/yolo_detection_report.json` — YOLO conf/IoU/imgsz, model params, detection stats
- `reports/pipeline_report.json` — full run summary + training metrics

Tune YOLO thresholds:

```bash
python yolo_detect.py --conf 0.35 --iou 0.50 --imgsz 640
```
