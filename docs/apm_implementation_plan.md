# Implementation Plan: Attendance Processing Module (APM)

## Overview
This document outlines the detailed flow and implementation plan for the Attendance Processing Module (APM-01 to APM-07). It involves real-time face detection, recognition using embeddings, attendance marking, and manual overrides.

## System Architecture

The implementation will be divided into three core layers:
1. **Frontend (React)**: Handles real-time video capture, bounding box rendering, and communication with the backend.
2. **Backend (FastAPI)**: Serves as the API gateway, managing database records (sessions, attendance statuses), and routing frames to the ML module.
3. **ML Module (Python)**: Handles face detection and embedding extraction using optimized/quantized models.

## Phase 1: Real-Time Face Detection (APM-01 & APM-07)
- **Frontend**: 
  - Integrate `react-webcam` to capture video frames.
  - Process video frames and send them to the backend via WebSockets (or fast HTTP polling) for low-latency processing.
  - Receive bounding box coordinates from the backend and draw them on an HTML5 canvas overlay.
- **ML Module**:
  - Implement a lightweight face detector (e.g., MediaPipe Face Detection or a pruned MTCNN/RetinaFace model) optimized for CPU.
  - Process frames in under 2 seconds (optimally <100ms per frame).

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
  - Build an Attendance Table view listing all students for a session.
  - Add an edit toggle allowing teachers/admins to change status (`Present` <-> `Absent`).
- **Backend API**:
  - Implement a PUT/PATCH endpoint to manually update attendance records.
  - Add logging to track who modified the record and when (audit trail).
  - Enforce role-based access control (only Teachers/Admins).

## Next Steps
1. Initialize the ML pipeline with lightweight models.
2. Set up WebSocket/API endpoints in the FastAPI backend for frame processing.
3. Build the frontend real-time tracking interface (Camera + Canvas).
4. Implement the database schema for Attendance Sessions and Logs.
