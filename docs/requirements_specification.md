# Requirements Specification — Smart Attendance System

> **Last updated:** 2026-06-18  
> **Total user stories:** 55  
> **Status:** ✅ **55/55 implemented** (294/294 story points)

Validated by backend pytest suites and frontend Vitest tests. See [`project_audit_report.md`](project_audit_report.md) for module-level detail.

---

## Module 1: Authentication & User Management (UAM)

**Module status:** ✅ Complete  
**Story points:** 20/20

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| UAM-01 | Log in securely as teacher/admin | High | 3 | ✅ |
| UAM-02 | Log out | Medium | 2 | ✅ |
| UAM-03 | Maintain instructor bio on profile | Medium | 2 | ✅ |
| UAM-04 | Reset forgotten password | High | 3 | ✅ |
| UAM-05 | Admin manages user roles | High | 5 | ✅ |
| UAM-06 | Student signup and login | Medium | 3 | ✅ |
| UAM-07 | Update profile picture | Low | 2 | ✅ |

**Implementation:** `backend/app/api/v1/auth.py`, auth pages in `frontend/src/pages/auth/`, JWT + RBAC in `app/core/permissions.py`.

---

## Module 2: Student Registration — Face Enrollment (FEM)

**Module status:** ✅ Complete  
**Story points:** 31/31

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| FEM-01 | Register student basic information | High | 3 | ✅ |
| FEM-02 | Capture multiple webcam face samples | High | 5 | ✅ |
| FEM-03 | Convert faces to embeddings | High | 8 | ✅ |
| FEM-04 | Bulk upload student photos / CSV | Medium | 5 | ✅ |
| FEM-05 | View enrolled student gallery | Medium | 3 | ✅ |
| FEM-06 | Validate face quality (blur/lighting) | Medium | 5 | ✅ |
| FEM-07 | Re-enroll when appearance changes | Low | 2 | ✅ |

**Implementation:** `ml/face_encoder.py`, `ml/quality_validator.py`, `POST /students/{id}/enroll-face`, `WebcamCapture.jsx`.

---

## Module 3: Attendance Processing (APM)

**Module status:** ✅ Complete  
**Story points:** 42/42

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| APM-01 | Real-time face detection | High | 5 | ✅ |
| APM-02 | Match faces to stored embeddings | High | 8 | ✅ |
| APM-03 | Label unrecognized faces as Unknown | Medium | 3 | ✅ |
| APM-04 | Auto-mark Present on recognition | High | 5 | ✅ |
| APM-05 | Mark undetected as Absent on session close | High | 5 | ✅ |
| APM-06 | Manual attendance override | Medium | 3 | ✅ |
| APM-07 | Optimized lightweight recognition | High | 13 | ✅ |

**Implementation:** `WS /sessions/{id}/detect`, `ml/face_matcher.py` (threshold 0.45), `LiveClassroom.jsx`.

---

## Module 4: Attendance Summary (AS)

**Module status:** ✅ Complete  
**Story points:** 25/25

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| AS-01 | View attendance summary | Medium | 5 | ✅ |
| AS-02 | Per-student attendance percentage | Medium | 5 | ✅ |
| AS-03 | Export attendance data | Medium | 5 | ✅ |
| AS-04 | Visual attendance trend chart | Low | 3 | ✅ |
| AS-05 | Poor attendance report (< 75%) | High | 5 | ✅ |
| AS-06 | Last-seen timestamps | Medium | 2 | ✅ |

**Implementation:** `report_service.py`, `ReportsLogs.jsx`, CSV/PDF export.

---

## Module 5: System Administration (SAM-Admin)

**Module status:** ✅ Complete  
**Story points:** 25/25

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| SA-01 | System health dashboard | Medium | 3 | ✅ |
| SA-02 | Manage roles and permissions | High | 5 | ✅ |
| SA-03 | Backup attendance/attention data | Low | 3 | ✅ |
| SA-04 | Audit log for manual corrections | Medium | 3 | ✅ |
| SA-05 | SIS student import | High | 5 | ✅ |
| SA-06 | CI/CD pipeline for deployments | High | 8 | ✅ |

**Implementation:** `SystemSettings.jsx`, `system.py`, `.github/workflows/ci.yml`.

---

## Module 6: Behavioural Attention Tracking (BTM)

**Module status:** ✅ Complete  
**Story points:** 45/45

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| BTM-01 | Analyze head pose for engagement | High | 8 | ✅ |
| BTM-02 | Real-time attention score per student | High | 5 | ✅ |
| BTM-03 | Posture / sleepiness detection | Medium | 5 | ✅ |
| BTM-04 | Class engagement average | Medium | 3 | ✅ |
| BTM-05 | Log persistent disengagement patterns | High | 8 | ✅ |
| BTM-06 | Correlate attention with session time | Low | 3 | ✅ |
| BTM-07 | Optimized models for real-time use | High | 13 | ✅ |

**Implementation:** `ml/head_pose.py`, `ml/attention_scorer.py`, `ml/posture_detector.py`, `AttentionAnalysis.jsx`.

---

## Module 7: Academic Intervention & Alerting (AIM)

**Module status:** ✅ Complete  
**Story points:** 37/37

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| AIM-01 | Low engagement dashboard alert | High | 5 | ✅ |
| AIM-02 | Flag frequent disengagement for counselors | High | 8 | ✅ |
| AIM-03 | Custom attention thresholds per course | Medium | 3 | ✅ |
| AIM-04 | Centralized alert log | Medium | 5 | ✅ |
| AIM-05 | Configure notification delivery | Low | 3 | ✅ |
| AIM-06 | Classroom engagement heatmap | Medium | 5 | ✅ |
| AIM-07 | Attendance–attention correlation report | High | 8 | ✅ |

**Implementation:** `alert_service.py`, `AlertsPage.jsx`, correlation in `correlation_service.py`.

---

## Module 8: Reporting & Statistical Summary (RSM)

**Module status:** ✅ Complete  
**Story points:** 37/37

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| RSM-01 | Real-time attendance dashboard | High | 5 | ✅ |
| RSM-02 | Post-class engagement summary | High | 8 | ✅ |
| RSM-03 | Monthly at-risk report for counselors | High | 8 | ✅ |
| RSM-04 | Automated CSV/PDF reports | Medium | 5 | ✅ |
| RSM-05 | Focus heatmap across courses | Medium | 5 | ✅ |
| RSM-06 | Periodic institutional email summary | Low | 3 | ✅ |
| RSM-07 | Student personal portal | Medium | 3 | ✅ |

**Implementation:** `report_service.py`, `DashboardHome.jsx`, `StudentPortal.jsx`.

---

## Module 9: Announcements / System Management (SAM)

**Module status:** ✅ Complete  
**Story points:** 32/32

| ID | User Story | Priority | SP | Status |
|----|-----------|----------|----|--------|
| SAM-01 | Manage courses and subjects | High | 5 | ✅ |
| SAM-02 | Backup data | Low | 3 | ✅ |
| SAM-03 | CI/CD for model deployments | High | 8 | ✅ |
| SAM-04 | Monitor system health | Medium | 3 | ✅ |
| SAM-05 | RBAC management | High | 5 | ✅ |
| SAM-06 | Audit log for corrections | Medium | 3 | ✅ |
| SAM-07 | SIS enrollment import | High | 5 | ✅ |

**Implementation:** `courses.py`, `batch_service.py`, `SystemSettings.jsx`.

---

## Traceability

| Phase | Modules | Status |
|-------|---------|--------|
| 0 | Foundations | ✅ |
| 1 | Database & persistence | ✅ |
| 2 | Authentication | ✅ |
| 3 | Face enrollment & recognition | ✅ |
| 4 | Attendance processing | ✅ |
| 5 | Reporting | ✅ |
| 6 | Attention tracking | ✅ |
| 7 | Alerting | ✅ |
| 8 | System admin & courses | ✅ |
| 9 | Student portal | ✅ |
| 10 | Testing, security, deployment | ✅ |

See [`development_todo.md`](development_todo.md) for the original phased task breakdown.
