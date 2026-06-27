# Implementation Plan: Attendance Processing Module (APM)

> **Last updated:** 2026-06-18  
> **Status:** ✅ **Fully implemented**

---

## Current implementation status

| Layer | Component | Status |
|-------|-----------|--------|
| **Frontend** | `LiveClassroom.jsx` | ✅ Course selector, session create, WebSocket, canvas overlay, roster, override, close |
| **Frontend** | WebSocket client | ✅ `WS /api/v1/sessions/{id}/detect` with attention overlay |
| **Frontend** | Session REST | ✅ `POST /sessions`, `PUT /close`, `PUT /attendance/{id}` |
| **Backend** | Session service | ✅ Create, recognize, close, override, unknown counter |
| **Backend** | WebSocket handler | ✅ Detect → encode → match → attend → attention → alerts |
| **Backend** | Database | ✅ `Session`, `Attendance` models with Alembic migrations |
| **ML** | Face detection | ✅ `ml/face_detector.py` (MTCNN / MediaPipe) |
| **ML** | Embeddings | ✅ `ml/face_encoder.py` |
| **ML** | Matching | ✅ `ml/face_matcher.py` (cosine threshold 0.45) |
| **ML** | Attention (Phase 6) | ✅ Head pose + scorer integrated in same WS pipeline |

Legacy routes removed: `POST /attendance/enroll`, `WS /attendance/ws/detect`.

---

## Architecture

```
Browser (LiveClassroom)
    │  base64 JPEG frames (~5 FPS)
    ▼
WS /api/v1/sessions/{id}/detect
    │
    ├─► face_detector     → bounding boxes
    ├─► face_encoder      → embedding per face
    ├─► face_matcher      → student ID (or Unknown)
    ├─► session_service   → mark Present in DB
    ├─► head_pose         → yaw/pitch/roll
    ├─► attention_scorer  → 0–100 score (EMA smoothed)
    ├─► posture_detector  → alert/head_down/looking_away/tilted
    └─► alert_service     → low engagement (≥5 min below threshold)
```

---

## User story mapping

| Story | Implementation |
|-------|----------------|
| APM-01 Real-time detection | MediaPipe/MTCNN in `face_detector.py`; canvas overlay in frontend |
| APM-02 Embedding match | `FaceMatcher.match()` against enrolled gallery |
| APM-03 Unknown faces | Below-threshold match → status Unknown; unknown counter in session |
| APM-04 Auto Present | `record_recognition()` on each match (idempotent) |
| APM-05 Absent on close | `close_session()` marks roster members without Present as Absent |
| APM-06 Manual override | `PUT /attendance/{record_id}` with `override: true` |
| APM-07 Performance | CPU-friendly models; optional facenet-pytorch; frame debouncing |

---

## WebSocket message contract

See [`api_design.md`](api_design.md#websocket-protocol) for full request/response schemas.

**Connect payload:** `{ "type": "connected", "attention_available": bool, "attention_reason": str? }`

---

## Session lifecycle

1. Teacher selects course → `POST /sessions` → receives `session_id`
2. Frontend opens WebSocket → streams frames
3. Each recognized student gets attendance + attention updates
4. Teacher may manually override roster entries
5. `PUT /sessions/{id}/close` → finalize absentees, store `avg_class_attention`

---

## Thresholds

| Parameter | Value | Location |
|-----------|-------|----------|
| Match confidence | ≥ 0.45 cosine (0.30 single-student) | `face_matcher.py` |
| Face detect confidence (live) | 0.35 | `face_detector.py` |
| Attention low band | < 40 | `attention_scorer.py` |

---

## Tests

- `backend/tests/test_sessions.py` — create, close, override, idempotency
- `backend/tests/test_session_attention_ws.py` — WS attention payload smoke test
