# Backend API Reference

> **Last updated:** 2026-06-18  
> **Base URL:** `http://localhost:8000/api/v1`  
> **Framework:** FastAPI (Python 3.11)  
> **Interactive docs:** `/docs` · `/redoc`

All protected routes require `Authorization: Bearer <JWT>` unless noted. Role requirements use the permission matrix in [`roles.md`](roles.md).

---

## Top-level routes (outside `/api/v1`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | None | Welcome message |
| `GET` | `/health` | None | Liveness check |
| `GET` | `/uploads/{path}` | None | Static uploaded files (avatars) |

---

## Authentication — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | None | Student self-registration |
| `POST` | `/register/staff` | Staff key header | Admin/teacher/counselor registration |
| `POST` | `/login` | None | Returns JWT access token |
| `POST` | `/logout` | User | Blacklist token |
| `GET` | `/me` | User | Current profile |
| `PUT` | `/me` | User | Update name, bio |
| `PUT` | `/me/avatar` | User | Upload profile picture (multipart) |
| `POST` | `/forgot-password` | None | Send reset email |
| `POST` | `/reset-password` | None | Reset with token |
| `GET` | `/admin/users` | Admin | List users |
| `PUT` | `/admin/users/{user_id}/role` | Admin | Change role |

Rate limits: login 10/min, register 20/min per IP (slowapi).

---

## Students — `/students`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/` | `students_read` | List students (counselor: batch-scoped) |
| `POST` | `/` | `manage_students` | Create student |
| `GET` | `/{student_id}` | `students_read` | Student detail |
| `PUT` | `/{student_id}` | `manage_students` | Update student |
| `DELETE` | `/{student_id}` | `delete_students` | Delete student (admin) |
| `POST` | `/validate-frame` | `manage_students` | Quality-check a webcam frame |
| `POST` | `/bulk-import` | `manage_students` | CSV bulk create |
| `POST` | `/{student_id}/enroll-face` | `manage_students` | Upload face images → embeddings |
| `POST` | `/{student_id}/re-enroll` | `manage_students` | Clear embeddings and re-capture |

Embeddings stored in PostgreSQL (JSONB). Minimum **10** valid samples. Quality: blur ≥80 Laplacian, brightness 40–220.

---

## Courses — `/courses`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/` | `courses_read` | List courses |
| `POST` | `/` | `manage_courses` | Create course |
| `GET` | `/{course_id}` | `courses_read` | Course detail |
| `PUT` | `/{course_id}` | `manage_courses` | Update course |
| `DELETE` | `/{course_id}` | `delete_courses` | Delete course (admin) |
| `GET` | `/{course_id}/detail` | `courses_read` | Detail with enrolled students |
| `POST` | `/{course_id}/enroll` | `manage_courses` | Enroll student in course |
| `DELETE` | `/{course_id}/enroll/{student_id}` | `manage_courses` | Remove enrollment |

---

## Sessions & attendance — `/sessions`, `/attendance`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/sessions` | `live_sessions` | Start session `{ course_id }` |
| `GET` | `/sessions` | `sessions_read` | List sessions |
| `GET` | `/sessions/{session_id}` | `sessions_read` | Session detail + stats |
| `PUT` | `/sessions/{session_id}/close` | `live_sessions` | Close session, mark absentees |
| `GET` | `/sessions/{session_id}/unknowns` | `sessions_read` | Unknown face count |
| `PUT` | `/attendance/{record_id}` | `attendance_override` | Manual override `{ status, override }` |
| `WS` | `/sessions/{session_id}/detect` | `live_sessions` | Live frame processing |

### WebSocket protocol

**Client → server:** `{ "type": "frame", "image": "<base64 JPEG>" }`

**Server → client:**

```json
{
  "faces": [{
    "x": 10, "y": 20, "width": 15, "height": 20,
    "status": "Present",
    "studentId": "STU-001",
    "studentName": "Jane Doe",
    "recognitionConfidence": 0.72,
    "attentionScore": 85.3,
    "headPose": { "yaw": 2.1, "pitch": -5.0, "roll": 0.5 },
    "posture": "alert",
    "postureFlagged": false
  }],
  "stats": { "present": 12, "unknown": 1, "class_attention": 74.2 },
  "alerts": []
}
```

**Pipeline:** detect faces → encode → match (threshold **0.45** cosine) → mark attendance → head pose → attention score → posture → optional low-engagement alert.

On connect, server sends `{ "type": "connected", "attention_available": true|false }`.

---

## Exam monitoring — `/exams`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/exams` | `exam_sessions` | Create exam `{ course_id, room_name }` |
| `GET` | `/exams` | `exam_violations_read` | List exams (counselor batch-scoped via `batch_id`) |
| `GET` | `/exams/dashboard` | `exam_violations_read` | KPIs for dashboard card |
| `GET` | `/exams/{exam_id}` | `exam_violations_read` | Exam detail + stats |
| `POST` | `/exams/{exam_id}/start` | `exam_sessions` | Begin calibration |
| `POST` | `/exams/{exam_id}/calibrate` | `exam_sessions` | Finalize baseline, activate monitoring |
| `PUT` | `/exams/{exam_id}/close` | `exam_sessions` | End exam session |
| `GET` | `/exams/{exam_id}/violations` | `exam_violations_read` | Paginated violation log |
| `PUT` | `/exams/{exam_id}/violations/{vid}/review` | `exam_violations_review` | Confirm/dismiss with note |
| `GET` | `/exams/{exam_id}/export/pdf` | `exam_reports_export` | Integrity report PDF |
| `WS` | `/exams/{exam_id}/monitor` | `exam_monitor` | Live hall frame processing |

Separate from `/sessions` — no attendance or attention writes. See [`exam_monitoring.md`](exam_monitoring.md).

---

## Reports — `/reports`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/attendance` | `reports_read` | Session attendance summary |
| `GET` | `/attendance/student/{student_id}` | `reports_read` | Per-student attendance |
| `GET` | `/at-risk` | `reports_read` | Students below attendance/attention thresholds |
| `GET` | `/trends` | `reports_read` | Attendance + attention trends |
| `GET` | `/last-seen` | `reports_read` | Last seen timestamps |
| `GET` | `/dashboard` | `reports_read` | Dashboard KPIs (counselor: batch-scoped) |
| `GET` | `/correlation/student/{student_id}` | `reports_read` | Attendance vs attention correlation |
| `GET` | `/correlation/batch` | `reports_read` | Batch correlation scatter data |
| `GET` | `/export/csv` | `export_reports` | CSV download |
| `GET` | `/export/pdf` | `export_reports` | PDF download |

Default at-risk thresholds: attendance **< 75%**, attention **< 40**.

---

## Attention — `/attention`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/live` | `attention_read` | In-memory scores for active session |
| `GET` | `/class-average` | `attention_read` | Class average for session |
| `GET` | `/student/{student_id}/history` | `attention_read` | Historical averages |
| `GET` | `/timeline` | `attention_read` | Time-series for session chart |

---

## Alerts — `/alerts`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/` | `alerts` | Alert log (counselor: batch-scoped) |
| `PUT` | `/{alert_id}/resolve` | `alerts` | Resolve alert |
| `GET` | `/risk-list` | `alerts` | At-risk students |
| `POST` | `/thresholds` | `alerts` | Set per-course thresholds |
| `GET` | `/thresholds` | `alerts` | Get thresholds |
| `GET` | `/notifications` | `alerts` | Notification preferences |
| `PUT` | `/notifications` | `alerts` | Update preferences |

Live low-engagement alert: score below threshold for **≥ 5 minutes**.

---

## Counselor batches — `/batches`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/` | `batches_manage` | List all batches (admin) |
| `GET` | `/mine` | `batches_read` | Counselor's assigned batches |
| `GET` | `/import-template` | `batches_manage` | CSV template download |
| `POST` | `/import-csv` | `batches_manage` | Import batch assignment CSV |
| `GET` | `/{batch_id}/students` | `batches_read` | Batch roster with stats |

CSV format: see [`roles.md`](roles.md#counselor-batch-assignment).

---

## Student portal — `/portal`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/me` | student | Profile + linked student record |
| `GET` | `/attendance` | student | Own attendance summary |
| `GET` | `/attention` | student | Own attention history |
| `GET` | `/courses` | student | Enrolled courses |

---

## System admin — `/system`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/health` | `system_admin` | DB + ML pipeline status |
| `POST` | `/backup` | `system_admin` | Database backup download |
| `POST` | `/restore` | `system_admin` | Restore from SQL dump |
| `GET` | `/audit-log` | `system_admin` | Audit trail |
| `POST` | `/sis-import` | `system_admin` | SIS CSV import |
| `POST` | `/email-summary/configure` | `system_admin` | Email summary schedule |
| `POST` | `/email-summary/trigger` | `system_admin` | Trigger summary email |

---

## Database models

`User`, `Student`, `Course`, `CourseStudent`, `Session`, `Attendance`, `AttentionLog`, `Alert`, `AuditLog`, `CounselorBatch`, `ExamSession`, `ExamViolation`, `ExamCalibration`

Migrations: `backend/alembic/versions/` (3 revisions, head: `b7e4f1a2c3d6`).

---

## Removed / deprecated

- `POST /api/v1/attendance/enroll` — replaced by `POST /students/{id}/enroll-face`
- `WS /api/v1/attendance/ws/detect` — replaced by `WS /sessions/{id}/detect`
