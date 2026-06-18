# Phase 3 — Face Enrollment & ML Recognition Core (FEM)

> **Priority:** 🔴 Critical · **Est. effort:** 4–5 days
> **WBS coverage:** 5.0 (Module 2 — Student Registration & Face Enrollment), 6.0 (ML / Face Recognition Pipeline)
> **User stories:** FEM-02, FEM-03, FEM-04, FEM-06, FEM-07, APM-07 (model optimization). *(FEM-01, FEM-05 already complete — validated here.)*
> **Depends on:** Phase 1 (`Student` model + embedding column), Phase 2 (auth/RBAC on all routes).
> **Unblocks:** Phase 4 (real recognition needs real embeddings + matcher).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Make face enrollment real end-to-end: build the `ml/` recognition package (encoder, matcher, quality validator), replace the mock `np.random.rand(128)` embeddings and in-memory store with a real model writing to the database, and expose the canonical student REST API the frontend already expects. This is the phase where the system stops faking recognition.

---

## 2. Entry State (baseline from `project-current-state.md`)

- **ML directory `ml/` is empty.** No encoder, matcher, or requirements.
- `backend/app/services/ml_service.py` does **real** work for: base64 decode, Laplacian blur check, MediaPipe single-face detection, resize 160×160, normalize. It **mocks** embeddings (`np.random.rand(128)`) and stores them in an in-memory dict.
- Existing endpoint `POST /api/v1/attendance/enroll` works but is mock + non-persistent and at the **wrong path** (frontend calls `/students/{id}/enroll`).
- `FaceEnrollment.jsx` and `StudentManagement.jsx` are API-ready with `localStorage` fallback. **FEM-01 (registration form) and FEM-05 (gallery) are complete.**
- `WebcamCapture.jsx` quality warnings + face-detection success are **simulated** (`Math.random()`), not real CV → **FEM-06 pending**.
- No student REST routes (`GET/POST/PUT/DELETE /students`) exist.

---

## 3. Tasks

### 3.1 ML Environment & Models (WBS 6.1, 6.2, 6.3)

- **3.1 `ml/requirements.txt` + package structure (WBS 6.1)** — torch, torchvision, facenet-pytorch, opencv-python-headless, numpy, mediapipe, onnxruntime. Establish `ml/` as an importable package.
- **3.2 `ml/face_encoder.py` (WBS 6.2.1)** → **FEM-02, FEM-03**: MTCNN detection/alignment + `InceptionResnetV1(pretrained='vggface2')` → **512-d** embedding per face. Accept multi-angle captures (front/left/right/up/down).
- **3.3 `ml/face_matcher.py` (WBS 6.2.2)** → **APM-02 (used in Phase 4)**: cosine similarity vs enrolled embeddings, configurable threshold (default 0.6), returns `(student_id, confidence)` or `(None, 0)`.
- **3.4 Quality validator (WBS 6.2.3)** → **FEM-06**: blur/lighting/pose checks exposed as a reusable function so the backend returns **real** quality feedback (replacing the simulated warnings in `WebcamCapture.jsx`).

### 3.2 Model Optimization (WBS 6.3 — APM-07)

- **3.5 `ml/optimize_model.py` (WBS 6.3.1, 6.3.2, 6.3.3)** → **APM-07**: export encoder to ONNX, quantize INT8 for CPU, benchmark latency/memory under multi-face load. Target <100ms/face on CPU. *(Optimization can be finalized in parallel with Phase 4; the un-optimized model is acceptable for first integration.)*

### 3.3 Backend — Student Service & API (WBS 5.1)

- **3.6 Replace mock embeddings (WBS 5.1.8, 5.1.9)** in `backend/app/services/ml_service.py`: import `FaceEncoder`, generate real 512-d vectors; remove the in-memory `student_embeddings` dict and persist embeddings to the `Student` table (Phase 1) → **FEM-03**.
- **3.7 Student schemas (WBS 5.1.1)** → `backend/app/schemas/student.py`: `StudentCreate`, `StudentResponse`, `BulkImportResponse`, `EnrollFaceRequest(images: list[str])`.
- **3.8 Student service (WBS 5.1.2–5.1.6)** → `backend/app/services/student_service.py`:
  - `create_student` (reject duplicate `student_id`/`roll_no`) → **FEM-01 (backend)**
  - `get_students(skip, limit, search, course, dept)` → **FEM-05 (backend)**
  - `enroll_face` (validate quality → embed → persist, ≥10 valid images) → **FEM-02, FEM-03, FEM-06**
  - `bulk_import_csv` → **FEM-04**
  - `bulk_enroll_zip` → **FEM-04**
  - `re_enroll` (clear old, capture new, write audit history) → **FEM-07**
- **3.9 Student routes (WBS 5.1.7)** → `backend/app/api/v1/students.py`, registered in `router.py`, all auth-protected:
  - `GET /students` (FEM-05), `GET /students/{id}`, `POST /students` (FEM-01), `PUT /students/{id}`, `DELETE /students/{id}`
  - `POST /students/{id}/enroll-face` (FEM-02, FEM-03) — **canonical path replacing `/attendance/enroll`**
  - `POST /students/{id}/re-enroll` (FEM-07)
  - `POST /students/bulk-import` (FEM-04), `POST /students/bulk-enroll` (FEM-04)

### 3.4 Frontend (WBS 5.2)

- **3.10 Align `FaceEnrollment.jsx` (WBS 5.2.1)** → call `POST /students/{id}/enroll-face` (canonical path), remove the simulated enrollment delays/quality toasts in favor of backend responses → **FEM-02**.
- **3.11 Align `StudentManagement.jsx` (WBS 5.2.2)** → CRUD + bulk import to live `/students*` routes → **FEM-01, FEM-04, FEM-05**.
- **3.12 Real quality feedback in `WebcamCapture.jsx` (WBS 5.2.3, 5.2.4)** → replace `Math.random()` warnings with backend quality-validator results; validate guided multi-angle capture against backend → **FEM-06, FEM-02**.
- **3.13 Re-enroll UI + history (WBS 5.2.5)** → wire the existing `?student=` re-enroll flow to `POST /students/{id}/re-enroll` and display audit history → **FEM-07**.
- **3.14 Remove `localStorage` fallback (WBS 5.2.6)** for students/enrollment **after** routes are verified (retire `smart_attendance_enrolled_students`).

---

## 4. Contract Alignment Resolved Here

| Frontend expects | Was | Now |
|------------------|-----|-----|
| `POST /students/{id}/enroll` | `POST /attendance/enroll` (mock) | `POST /api/v1/students/{id}/enroll-face` (real, persisted) |
| `GET/POST/PUT/DELETE /students` | none | implemented |
| `POST /students/bulk-import`, `/bulk-enroll` | none | implemented |
| quality warnings | simulated in UI | real CV from backend validator |

> The legacy `POST /attendance/enroll` may be kept as a thin alias during transition, then removed once `FaceEnrollment.jsx` is fully on the new path.

---

## 5. Deliverables & Acceptance Criteria

- Enrolling a student produces a **real 512-d embedding persisted to Postgres** (survives restart).
- Duplicate `student_id`/`roll_no` is rejected with a clear error.
- Bulk CSV import and bulk ZIP enrollment work and report imported/errors.
- Webcam capture surfaces **real** blur/lighting/pose feedback.
- Re-enrollment clears old embeddings and logs audit history.
- Two embeddings of the same person have high cosine similarity; different people low — verified with the matcher (sets up Phase 4).

---

## 6. Exit Criteria (Definition of Done)

1. No `np.random.rand` embeddings and no in-memory embedding dict remain.
2. `ml/face_encoder.py` + `ml/face_matcher.py` are importable by the backend and unit-sanity-checked.
3. Frontend enrollment + student management run against the live API with `localStorage` retired.
4. Matcher returns correct match/non-match on a small manual test set (readiness gate for Phase 4).

---

## 7. Alignment Notes

- **Consumes:** Phase 1 `Student`/embedding column; Phase 2 auth on all `/students*` routes.
- **Unblocks Phase 4:** real embeddings in DB + `FaceMatcher` are exactly what the session WebSocket needs to do real recognition (APM-01/APM-02).
- **Shares with Phase 6:** the `ml/` package structure and ONNX optimization approach (APM-07) are reused for the attention models (BTM-07).
- **Privacy:** finalize the biometric consent/retention sections of `docs/privacy_and_ethics.md` (Phase 0 stub) now that real embeddings are stored.
