# Phase 7 — Academic Intervention & Alerting (AIM)

> **Priority:** 🟡 High · **Est. effort:** 5–6 days
> **WBS coverage:** 10.0 (Module 7 — Academic Intervention & Alerting), 11.0 partial (RSM-02, RSM-05)
> **User stories:** AIM-01, AIM-02, AIM-03, AIM-04, AIM-05, AIM-06, AIM-07, RSM-02, RSM-05
> **Depends on:** Phase 6 (attention scores), Phase 5 (attendance %/at-risk), Phase 1 (`Alert` model), Phase 2 (auth/roles).
> **Unblocks:** Phase 8 notification config tab; Phase 10 closure.
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Turn attendance + attention data into actionable intervention: real-time low-engagement detection and alerts, risk-list generation, configurable thresholds, an immutable alert log, notification preferences, a classroom engagement heatmap, the attendance↔attention correlation report, and a post-class engagement summary. This is the first phase that fixes the broken `/dashboard/alerts` sidebar route with a real page.

---

## 2. Entry State (baseline from `project-current-state.md`)

- **Module 7 is ~0%.** The only artifact is a sidebar "Alerts" link pointing to `/dashboard/alerts`, which is **not defined** in `App.jsx` (404 → redirect). Phase 0 repointed it to a placeholder.
- No alert backend, no `Alert` usage (table exists from Phase 1), no thresholds, no heatmap, no correlation.
- Phase 5 provides attendance % + at-risk; Phase 6 provides attention scores + disengagement history — both required inputs here.

---

## 3. Tasks

### 3.1 Backend — Alert Service & Routes (WBS 10.1)

- **7.1 `backend/app/services/alert_service.py` (WBS 10.1.1–10.1.5):**
  - `check_low_engagement(student_id, score, threshold, minutes)` — trigger if below threshold >5 min → **AIM-01**
  - `generate_risk_list(week)` — students with >3 low-engagement sessions/week → **AIM-02**
  - `set_threshold(course_id, value)` — custom per-course (0–100) → **AIM-03**
  - `log_alert(alert)` — immutable record (timestamp, type, student_id) → **AIM-04**
  - `configure_notifications(user_id, channels)` — dashboard/email + frequency → **AIM-05**
- **7.2 Correlation service (WBS 10.1.6)** → `backend/app/services/correlation_service.py`: merge attendance (Present/Absent) with attention scores → `{student_id, attendance_pct, avg_attention, correlation_flag}` → **AIM-07**.
- **7.3 Alert routes (WBS 10.1.7)** → `backend/app/api/v1/alerts.py` (registered in `router.py`, role-gated to teacher/counselor/admin):
  - `GET /alerts?student_id=&type=&date=` → **AIM-04**
  - `GET /alerts/risk-list?week=` → **AIM-02**
  - `POST /alerts/thresholds`, `GET /alerts/thresholds?course_id=` → **AIM-03**
  - `PUT /alerts/{id}/resolve`
  - `PUT /alerts/notifications` → **AIM-05**
- **7.4 Correlation routes** → `GET /reports/correlation?student_id=` and `GET /reports/correlation/batch?department=` (counselor view) → **AIM-07**.
- **7.5 Real-time alert emission** → in the WebSocket pipeline (Phases 4+6), when `check_low_engagement` fires, push an alert event to the client and `log_alert`.

### 3.2 Frontend (WBS 10.2)

- **7.6 Real-time alert banner (WBS 10.2.1)** → dashboard pop-up on threshold breach (student name + location); auto-dismiss 10s/on click → **AIM-01**.
- **7.7 Risk-list page (WBS 10.2.2)** → new `/dashboard/alerts` route + page: table (name, #alerts/week, avg attention, recommended action); restricted to counselors+admins → **AIM-02**. *(Replaces the broken sidebar link with a real destination.)*
- **7.8 Threshold configuration UI (WBS 10.2.3)** → per-course slider (0–100) in course settings; applies to live monitoring → **AIM-03**.
- **7.9 Notification preferences UI (WBS 10.2.4)** → toggles (dashboard/email) + frequency (immediate/hourly/daily) → **AIM-05**. *(Also surfaced in Phase 8 SystemSettings notification tab.)*
- **7.10 Classroom engagement heatmap (WBS 10.2.5)** → canvas overlay of desk areas colored by average attention; filter by course/instructor → **AIM-06, RSM-05**.
- **7.11 Correlation report view (WBS 10.2.6)** → dual-axis chart attendance % vs attention % per student + scatter + insight cards → **AIM-07**.
- **7.12 Post-class engagement summary (RSM-02)** → auto-generated after session close: class-attention-over-time graph, low-attention students + timestamps, session date/subject → **RSM-02**.

---

## 4. Contract Alignment Resolved Here

| Area | Was | Now |
|------|-----|-----|
| `/dashboard/alerts` | broken link → 404/placeholder | real Risk-List page |
| Alerts data | none | `GET /alerts`, `/alerts/risk-list` |
| Thresholds | none | `POST/GET /alerts/thresholds` |
| Notifications | none | `PUT /alerts/notifications` |
| Correlation | none | `GET /reports/correlation[/batch]` |

---

## 5. Deliverables & Acceptance Criteria

- Sustained low engagement raises a real-time banner and persists an immutable `Alert`.
- Risk list correctly identifies students with repeated weekly disengagement; access is role-restricted.
- Per-course thresholds persist and immediately affect live monitoring.
- Heatmap renders attention by area; correlation view shows attendance-vs-attention relationship.
- Post-class summary auto-generates on session close.
- Notification preferences persist and gate alert delivery.

---

## 6. Exit Criteria (Definition of Done)

1. All alert/correlation routes work, are role-gated, and write immutable alert records.
2. `/dashboard/alerts` is a real page; no broken sidebar link remains.
3. Real-time alerts fire from the live pipeline and are visible + logged.
4. Correlation + heatmap + post-class summary render from live data.

---

## 7. Alignment Notes

- **Consumes:** Phase 6 attention scores + disengagement history; Phase 5 attendance %/at-risk; Phase 1 `Alert`; Phase 2 roles (counselor/admin gating).
- **Shares with Phase 8:** notification preferences (AIM-05) also appear in the SystemSettings notification tab; build the API here, surface in both places.
- **Shares with Phase 5/8:** correlation/summary reuse the report/export services where useful.
- **Hands to Phase 10:** alert/correlation test suite (`test_alerts.py`).
