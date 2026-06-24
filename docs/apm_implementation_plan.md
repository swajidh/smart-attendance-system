# Implementation Plan: Attendance Processing Module (APM)

> **Last updated:** 2026-06-18

## Current Implementation Status

| Layer | Component | Status |
|-------|-----------|--------|
| **Frontend** | `LiveClassroom.jsx` | 🟡 Webcam feed, canvas bounding-box overlay, roster panel, manual override toggle, session finalize |
| **Frontend** | WebSocket client | 🟡 Connects to `WS /api/v1/sessions/{id}/detect`; offline fallback when backend unavailable |
| **Frontend** | Session API calls | 🟡 `POST /sessions`, `PUT /sessions/{id}/close`, `PUT /attendance/{record_id}` attempted; falls back to `localStorage` |
| **Backend** | `WS /api/v1/attendance/ws/detect` | 🟡 MediaPipe face detection works; student matching is random |
| **Backend** | Session/attendance REST routes | ❌ Not implemented |
| **Backend** | Database persistence | ❌ Not implemented |
| **ML** | Real embedding comparison | ❌ Not implemented (`ml/` directory empty) |

## Overview
This document outlines the detailed flow and implementation plan for the Attendance Processing Module (APM-01 to APM-07). It involves real-time face detection, recognition using embeddings, attendance marking, and manual overrides.

## System Architecture

The implementation will be divided into three core layers:
1. **Frontend (React)**: Handles real-time video capture, bounding box rendering, and communication with the backend.
2. **Backend (FastAPI)**: Serves as the API gateway, managing database records (sessions, attendance statuses), and routing frames to the ML module.
3. **ML Module (Python)**: Handles face detection and embedding extraction using optimized/quantized models.

## Phase 1: Real-Time Face Detection (APM-01 & APM-07)
- **Frontend**: 
  - ✅ `react-webcam` integrated in `LiveClassroom.jsx`
  - ✅ Frames sent to backend via WebSocket when connected (`captureAndSendFrame` at ~5 FPS)
  - ✅ Bounding box coordinates drawn on HTML5 canvas overlay
  - 🟡 Offline fallback: camera runs without detection when WebSocket unavailable
- **ML Module**:
  - 🟡 MediaPipe Face Detection implemented in `backend/app/services/ml_service.py`
  - ❌ No model optimization (APM-07 not started)

## Phase 2: Face Recognition & Embeddings (APM-02 & APM-03)
- **ML Module**:
  - Once faces are detected, pass cropped face regions to a lightweight recognition model (e.g., MobileFaceNet).
  - Extract embeddings and compare against a stored database of student embeddings using Cosine Similarity.
  - Apply a confidence threshold (e.g., > 0.6).
- **Backend API**:
  - Return the `studentId` if recognized, or tag as `Unknown` if below the threshold.
  - Log `Unknown` face occurrences for security audits.

## Phase 3: Automatic Attendance Marking (APM-04 & APM-05)
- **Backend API (Session Logic)**:
  - Create a new Attendance Session with a specific Session ID.
  - When a recognized student is received, update their status to `Present` in the database.
  - Implement idempotency to prevent duplicate `Present` marks for the same session.
  - Store the timestamp of the first recognition.
- **Session Closure**:
  - Provide an endpoint to "Close Session".
  - Iterate through the enrolled roster for the session; mark all students without a `Present` record as `Absent`.
  - Generate an attendance summary report.

## Phase 4: Manual Override (APM-06)
- **Frontend Dashboard**:
  - ✅ Attendance roster table with Present/Absent toggle in `LiveClassroom.jsx`
  - ✅ Manual override attempts `PUT /attendance/{record_id}`; updates local state regardless
- **Backend API**:
  - ❌ PUT endpoint not implemented
  - ❌ Audit trail and RBAC not implemented

## Next Steps
1. Implement session REST API (`POST /sessions`, `PUT /sessions/{id}/close`) and align WebSocket path with frontend
2. Replace random matching in `ml_service.py` with real embedding comparison
3. Initialize the `ml/` module with FaceEncoder and FaceMatcher
4. Implement the database schema for Attendance Sessions and Logs
