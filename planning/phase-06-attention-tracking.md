# Phase 6 — Behavioural Attention Tracking (BTM)

> **Priority:** 🟡 High · **Est. effort:** 5–7 days
> **WBS coverage:** 9.0 (Module 6 — Behavioural Attention Tracking)
> **User stories:** BTM-01, BTM-02, BTM-03, BTM-04, BTM-05, BTM-06, BTM-07
> **Depends on:** Phase 4 (detection WebSocket to extend), Phase 1 (`AttentionLog` model), Phase 2 (auth).
> **Unblocks:** Phase 7 (low-engagement alerts, correlation), Phase 9 (portal attention stats).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Add real attention/engagement tracking on top of the recognition pipeline: head-pose estimation, a 0–100 attention score, posture/sleepiness detection, persistence to `AttentionLog`, aggregate queries, and a full Attention Analysis UI (replacing the one-line placeholder). The attention computation **extends the Phase 4 WebSocket**, it does not create a separate pipeline.

---

## 2. Entry State (baseline from `project-current-state.md`)

- `AttentionAnalysis.jsx` is a **one-line placeholder** (`<div>Attention Analysis Placeholder</div>`); route `/dashboard/attention` renders it.
- **No attention ML** exists; `ml/` has only the face recognition modules from Phase 3.
- `AttentionLog` table exists (Phase 1) but is unused.
- Phase 4's `WS /sessions/{id}/detect` already detects + recognizes faces per frame — the natural hook point for per-student attention scoring.

---

## 3. Tasks

### 3.1 ML (WBS 9.1)

- **6.1 `ml/head_pose.py` (WBS 9.1.1)** → **BTM-01**: MediaPipe Face Mesh (468 landmarks) → yaw/pitch/roll; map to "looking at board". Per face, per frame.
- **6.2 `ml/attention_scorer.py` (WBS 9.1.2)** → **BTM-02**: head pose (+duration) → 0–100 score. Rules: forward gaze (yaw/pitch <15°) 80–100; slight deviation 15–30° → 50–80; major >30° → 20–50; head-down/eyes-closed 0–20. Smooth over a 60s window.
- **6.3 `ml/posture_detector.py` (WBS 9.1.3)** → **BTM-03**: MediaPipe Pose (33 landmarks) → head-down/slouching/lean; flag only if sustained >30s; returns `{posture, duration_seconds}`.
- **6.4 `ml/optimize_attention.py` (WBS 9.1.4)** → **BTM-07**: quantize Face Mesh + Pose; benchmark under 10-face load; target face+pose+attention <200ms/frame. Reuses the ONNX approach from Phase 3 (APM-07).

### 3.2 Backend — Attention Service & Routes (WBS 9.2)

- **6.5 `backend/app/services/attention_service.py` (WBS 9.2.1–9.2.3):**
  - `calculate_score(head_pose)` → **BTM-02**
  - `store_attention_log(session_id, student_id, score, pose)` → **BTM-06**
  - `get_class_engagement(session_id)` — mean of student scores → **BTM-04**
  - `get_disengagement_history(student_id, weeks)` — persistent low-attention patterns → **BTM-05**
- **6.6 Attention routes (WBS 9.2.4)** → `backend/app/api/v1/attention.py` (registered in `router.py`, auth-protected):
  - `GET /attention/live?session_id=` → **BTM-02**
  - `GET /attention/class-average?session_id=` → **BTM-04**
  - `GET /attention/student/{id}/history` → **BTM-05**
  - `GET /attention/timeline?session_id=` → **BTM-06**
- **6.7 Integrate into the WebSocket pipeline (WBS 9.2.5)** → in `WS /sessions/{id}/detect`, after recognition, run head-pose + scoring per recognized student; persist via `store_attention_log`; send attention data alongside face boxes. **Extends Phase 4 — same socket.**

### 3.3 Frontend (WBS 9.3)

- **6.8 Build full `AttentionAnalysis.jsx` (WBS 9.3.1)** → **BTM-02, BTM-04**: class-engagement gauge (0–100), student grid cards (photo, name, score, color), engagement timeline (Recharts line). Auto-refresh ~60s from `GET /attention/live`. Color: 🟢 >70 / 🟡 40–70 / 🔴 <40.
- **6.9 Attention badges in live roster (WBS 9.3.2)** → show per-student score in `LiveClassroom.jsx` roster, animate on update → **BTM-02**.
- **6.10 Engagement timeline component (WBS 9.3.3)** → Recharts line over lecture duration; highlight low-average "boring segments" → **BTM-06**.
- **6.11 Disengagement history view (WBS 9.3.4)** → weekly attention trend per student; flag persistent low engagement (>3 sessions/week below threshold) → **BTM-05**.

---

## 4. Contract Alignment Resolved Here

| Area | Was | Now |
|------|-----|-----|
| `/dashboard/attention` | one-line placeholder | full Attention Analysis page |
| Attention data | none | `GET /attention/{live,class-average,timeline}` + `student/{id}/history` |
| WebSocket payload | boxes + student IDs (Phase 4) | + per-student attention score & pose |
| `AttentionLog` table | unused | populated in real time |

---

## 5. Deliverables & Acceptance Criteria

- Each recognized student gets a real, smoothed 0–100 attention score during a live session.
- Posture flags (sleeping/slouching) trigger only after the >30s threshold.
- Class engagement average and per-student timelines are queryable and render correctly.
- `AttentionAnalysis.jsx` shows live gauge + student grid + timeline with correct color coding.
- Attention scores persist to `AttentionLog` with timestamps.

---

## 6. Exit Criteria (Definition of Done)

1. Attention scoring runs inside the Phase 4 WebSocket within the latency budget (<200ms/frame target under load).
2. All 4 attention routes return correct aggregates from `AttentionLog`.
3. Attention UI complete; placeholder removed; badges visible in live roster.
4. Disengagement history correctly flags persistent low-attention students (gate for Phase 7).

---

## 7. Alignment Notes

- **Consumes:** Phase 4 recognition WebSocket + recognized `student_id`s; Phase 1 `AttentionLog`; Phase 2 auth; Phase 3 `ml/` structure + ONNX approach.
- **Unblocks Phase 7:** real attention scores enable low-engagement detection (AIM-01), risk lists (AIM-02), thresholds (AIM-03), heatmap (AIM-06/RSM-05), and attendance↔attention correlation (AIM-07).
- **Unblocks Phase 9:** student portal attention trends (`/portal/attention`).
- **Ethics:** finalize the attention-tracking ethical-use section of `docs/privacy_and_ethics.md` (Phase 0 stub) now that scores are stored.
