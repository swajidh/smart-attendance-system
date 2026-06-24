# Requirements Specification — Smart Attendance System

> **Last Updated:** 2026-06-18  
> **Total User Stories:** 55  
> **Completed:** 3 | **Partial:** 17 | **Pending:** 35

---

## Module 1: Authentication & User Management (UAM)

**Module Status:** 🟡 Partially Completed (~15%) — frontend shell only, no backend auth  
**Story Points Total:** 20

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| UAM-01 | As a teacher/admin, I want to log into the system so that I can access attendance features securely. | High | 3 | ❌ Pending |
| UAM-02 | As a logged-in user, I want to log out so that my account remains secure. | Medium | 2 | 🟡 Partial (sidebar logout clears `localStorage`; no backend session) |
| UAM-03 | As an instructor, I want to maintain a bio about myself so that it is used on the course listing. | Medium | 2 | 🟡 Partial (`ProfilePage.jsx` UI; no backend) |
| UAM-04 | As a user, I want to reset my password if I forget it so that I can regain access to my account. | High | 3 | ❌ Pending |
| UAM-05 | As an admin, I want to manage user roles so that counselors and faculty only see relevant student data. | High | 5 | 🟡 Partial (sidebar role-based nav filtering with mock user only) |
| UAM-06 | As a student, I want to sign up and login so that I can see my registered attendance and attention progress. | Medium | 3 | ❌ Pending |
| UAM-07 | As a user, I want to update my profile picture so that the system has a current reference for identity verification. | Low | 2 | 🟡 Partial (`ProfilePage.jsx` avatar upload UI; no backend) |

---

## Module 2: Student Registration — Face Enrollment (FEM)

**Module Status:** 🟡 Partially Completed (~60%) — frontend complete with offline fallback; backend enrollment endpoint only  
**Story Points Total:** 31

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| FEM-01 | As an admin, I want to register a student's basic information so that they are added to the system database. | High | 3 | ✅ Done |
| FEM-02 | As an admin, I want to capture multiple face samples via a live webcam during registration for accurate recognition. | High | 5 | 🟡 Partial (15-sample guided capture with angle prompts in `WebcamCapture.jsx`) |
| FEM-03 | As a system, I want to convert captured faces into 128-d or 512-d embeddings so that recognition is computationally efficient. | High | 8 | 🟡 Partial (backend mock embeddings via `np.random.rand(128)`; no real model) |
| FEM-04 | As an admin, I want to upload existing student photos in bulk so that I can enroll an entire class at once. | Medium | 5 | 🟡 Partial (bulk upload UI with simulated processing; no backend) |
| FEM-05 | As an admin, I want to view a gallery of enrolled students to verify that the enrollment was successful. | Medium | 3 | ✅ Done |
| FEM-06 | As a system, I want to validate the quality of captured faces (lighting/blur) so that the attendance engine remains reliable. | Medium | 5 | 🟡 Partial (Laplacian blur check in backend; simulated UI warnings in frontend) |
| FEM-07 | As an admin, I want to update or re-enroll a student's face data if their appearance changes or recognition fails. | Low | 2 | 🟡 Partial (re-enroll button + `?student=` query param flow; no audit history backend) |

---

## Module 3: Attendance Processing Module (APM)

**Module Status:** 🟡 Partially Completed (~45%) — frontend live classroom built; backend WebSocket with mock matching only  
**Story Points Total:** 42

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| APM-01 | As a teacher, I want the system to detect faces in real-time so that manual attendance taking is eliminated. | High | 5 | 🟡 Partial (webcam + canvas overlay; WebSocket wired in frontend; offline fallback when backend unavailable) |
| APM-02 | As a system, I want to match detected faces with stored embeddings so that individual students can be identified. | High | 8 | ❌ Pending (backend uses random matching only) |
| APM-03 | As a system, I want to label unrecognized faces as "Unknown" so that the teacher can be notified of unauthorized persons. | Medium | 3 | 🟡 Partial (UI renders Unknown labels; backend assigns randomly) |
| APM-04 | As a teacher, I want the system to mark recognized students as "Present" so that records are updated automatically. | High | 5 | 🟡 Partial (roster updated from WebSocket response or `localStorage`) |
| APM-05 | As a system, I want to mark undetected students as "Absent" once the attendance session is closed. | High | 5 | 🟡 Partial (session finalize saves roster to `localStorage`; no backend session API) |
| APM-06 | As a teacher, I want to manually override or edit an attendance status so that I can correct any system errors. | Medium | 3 | ✅ Done |
| APM-07 | As an admin, I want the recognition process to be optimized to use the lightweight model so the system doesn't lag. | High | 13 | ❌ Pending |

---

## Module 4: Attendance Summary (AS)

**Module Status:** 🟡 Partially Completed (~35%)  
**Story Points Total:** 25

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| AS-01 | As a teacher, I want to view an attendance summary so that I can monitor student participation. | Medium | 5 | 🟡 Partial |
| AS-02 | As a teacher, I want to see each student's attendance percentage so that I can evaluate their consistency. | Medium | 5 | 🟡 Partial |
| AS-03 | As an admin, I want to export attendance data so that it can be shared officially with other departments. | Medium | 5 | ❌ Pending |
| AS-04 | As a teacher, I want a visual trend chart of attendance so that I can identify periods of high absenteeism. | Low | 3 | 🟡 Partial |
| AS-05 | As an admin, I want to generate a "Poor Attendance" report to identify students falling below the mandatory 75% threshold. | High | 5 | ❌ Pending |
| AS-06 | As a teacher, I want to see the "Last Seen" timestamp for each student in the attendance list. | Medium | 2 | ❌ Pending |

---

## Module 5: System Administration (SAM-Admin)

**Module Status:** ❌ Not Started  
**Story Points Total:** 25

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| SA-01 | As an admin, I want to view a system health dashboard so that I can monitor CPU, RAM, and storage usage. | Medium | 3 | ❌ Pending |
| SA-02 | As an admin, I want to manage user roles and permissions so that access is controlled per module. | High | 5 | ❌ Pending |
| SA-03 | As an admin, I want to backup attendance and attention data so that no critical data is lost. | Low | 3 | ❌ Pending |
| SA-04 | As a system admin, I want to maintain a log of all manual attendance corrections for auditing. | Medium | 3 | ❌ Pending |
| SA-05 | As an admin, I want to update the student enrollment list by importing data from the SIS. | High | 5 | ❌ Pending |
| SA-06 | As a system, I want to manage the CI/CD pipeline so that optimized models deploy automatically. | High | 8 | ❌ Pending |

---

## Module 6: Behavioural Attention Tracking Model (BTM)

**Module Status:** ❌ Not Started  
**Story Points Total:** 45

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| BTM-01 | As a teacher, I want the system to analyze student head poses so that I can determine if they are looking at the lecture material. | High | 8 | ❌ Pending |
| BTM-02 | As an instructor, I want to see a real-time "Attention Score" for each student on my dashboard so that I can gauge class focus. | High | 5 | ❌ Pending |
| BTM-03 | As a system, I want to track posture and body language to identify signs of sleepiness or extreme distraction. | Medium | 5 | ❌ Pending |
| BTM-04 | As a teacher, I want to see an aggregate "Class Engagement Average" to evaluate how well my lecture is being received. | Medium | 3 | ❌ Pending |
| BTM-05 | As a counselor, I want the system to log persistent disengagement patterns for students not performing well. | High | 8 | ❌ Pending |
| BTM-06 | As a system, I want to correlate attention data with the session timestamp so that instructors can identify "boring" segments. | Low | 3 | ❌ Pending |
| BTM-07 | As an admin, I want this behavioral analysis to run on optimized models so that real-time tracking doesn't crash the hardware. | High | 13 | ❌ Pending |

---

## Module 7: Academic Intervention & Alerting Module (AIM)

**Module Status:** ❌ Not Started  
**Story Points Total:** 37

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| AIM-01 | As an instructor, I want to receive a "Low Engagement" alert on my dashboard so that I can immediately address disinterest. | High | 5 | ❌ Pending |
| AIM-02 | As a counselor, I want the system to flag students with a high frequency of disengagement alerts for support meetings. | High | 8 | ❌ Pending |
| AIM-03 | As a teacher, I want to set custom attention thresholds for different subjects to account for varying lecture intensities. | Medium | 3 | ❌ Pending |
| AIM-04 | As a system, I want to store every engagement alert in a centralized log for formal academic intervention records. | Medium | 5 | ❌ Pending |
| AIM-05 | As an admin, I want to configure the notification delivery methods (dashboard pop-ups or email). | Low | 3 | ❌ Pending |
| AIM-06 | As a teacher, I want the system to provide a "Classroom Heatmap" of engagement based on physical CCTV coordinates. | Medium | 5 | ❌ Pending |
| AIM-07 | As a counselor, I want a correlation report between attendance and attention for holistic academic advice. | High | 8 | ❌ Pending |

---

## Module 8: Reporting & Statistical Summary Module (RSM)

**Module Status:** 🟡 Partially Completed (~25%)  
**Story Points Total:** 37

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| RSM-01 | As a teacher, I want to view a real-time attendance dashboard so that I can see current student participation at a glance. | High | 5 | 🟡 Partial |
| RSM-02 | As an instructor, I want to see an "Engagement Summary" after every class to identify effective lecture segments. | High | 8 | ❌ Pending |
| RSM-03 | As a counselor, I want to see a monthly "At-Risk Report" so I can proactively support underperforming students. | High | 8 | ❌ Pending |
| RSM-04 | As a registrar, I want the system to generate automated daily attendance files in CSV/PDF format. | Medium | 5 | ❌ Pending |
| RSM-05 | As a department head, I want to view a "Heatmap of Student Focus" across different courses. | Medium | 5 | ❌ Pending |
| RSM-06 | As an admin, I want to receive a periodic email summarizing institutional attendance. | Low | 3 | ❌ Pending |
| RSM-07 | As a student, I want to see my own attendance and attention percentages through a personal portal. | Medium | 3 | ❌ Pending |

---

## Module 9: Announcements / System Management (SAM)

**Module Status:** 🟡 Partially Completed (~15%) — course CRUD UI only  
**Story Points Total:** 32

| ID | User Story | Priority | Story Points | Status |
|----|-----------|----------|-------------|--------|
| SAM-01 | As an admin, I want to manage courses and subjects so that attendance sessions are organized properly. | High | 5 | 🟡 Partial (`CourseDashboard.jsx` CRUD via `localStorage`; no backend) |
| SAM-02 | As an admin, I want to backup attendance and attention data so that no critical data is lost. | Low | 3 | ❌ Pending |
| SAM-03 | As a system, I want to manage the CI/CD pipeline so that optimized model updates deploy automatically. | High | 8 | ❌ Pending |
| SAM-04 | As an IT support member, I want to monitor system health and resource usage. | Medium | 3 | ❌ Pending |
| SAM-05 | As an admin, I want to manage user roles and permissions (RBAC). | High | 5 | ❌ Pending |
| SAM-06 | As a system admin, I want to maintain a log of all manual attendance corrections for auditing. | Medium | 3 | ❌ Pending |
| SAM-07 | As an admin, I want to update the student enrollment list by importing data from the SIS. | High | 5 | ❌ Pending |
