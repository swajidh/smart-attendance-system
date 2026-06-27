# Frontend

React dashboard and landing page for the Smart Attendance System.

> **Last updated:** 2026-06-18

## Stack

| Tool | Version |
|------|---------|
| React | 19 |
| Vite | 8 |
| Tailwind CSS | 3 |
| React Router | 7 |
| Axios | API client |
| react-webcam | Camera capture |
| react-hot-toast | Notifications |
| recharts | Charts (reports page) |
| lucide-react | Icons |

## Running locally

```bash
cd frontend
npm install
npm run dev
```

Default dev server: `http://localhost:5173`

Set the API base URL via `.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Routes

| Path | Page | Status |
|------|------|--------|
| `/` | Landing page | ✅ Complete |
| `/dashboard` | Dashboard home | 🟡 Stats from `localStorage` |
| `/dashboard/students` | Student management | 🟡 API + `localStorage` fallback |
| `/dashboard/enrollment` | Face enrollment | 🟡 API + `localStorage` fallback |
| `/dashboard/courses` | Course management | 🟡 `localStorage` only |
| `/dashboard/live` | Live classroom | 🟡 WebSocket/API + offline fallback |
| `/dashboard/reports` | Reports & logs | 🟡 `localStorage`; mock export |
| `/dashboard/profile` | User profile | 🟡 API + mock user fallback |
| `/dashboard/attention` | Attention analysis | ✅ Live scores, timeline, history |
| `/dashboard/settings` | System settings (admin) | ✅ Users, health, batches, SIS |
| `/login`, `/signup`, `/forgot-password` | Auth | ❌ Not implemented (routes commented out) |

## Project structure

```
src/
├── components/
│   ├── dashboard/   # Sidebar, Topbar, WebcamCapture, StudentRegistrationForm
│   ├── landing/     # Landing page sections (used by pages/landing/LandingPage)
│   ├── layout/      # ProtectedRoute, DashboardLayout
│   └── ui/          # Button, Card, Input, Badge, Tabs, etc.
├── pages/
│   ├── landing/     # LandingPage (+ unused duplicate section files)
│   └── dashboard/   # All dashboard pages
├── services/
│   └── api.js       # Axios client with JWT interceptor
├── hooks/
│   └── useScrollReveal.js
├── App.jsx          # Route definitions
└── main.jsx         # Entry point
```

## API integration pattern

Dashboard pages call the backend via `src/services/api.js`. On failure, they fall back to `localStorage` so the UI remains usable without a running backend.

**`localStorage` keys used:**

| Key | Used by |
|-----|---------|
| `smart_attendance_enrolled_students` | StudentManagement, FaceEnrollment, LiveClassroom |
| `smart_attendance_courses` | CourseDashboard, DashboardHome, StudentManagement |
| `smart_attendance_session_logs` | LiveClassroom, ReportsLogs, DashboardHome |
| `smart_attendance_user` | ProtectedRoute, Sidebar, ProfilePage |
| `smart_attendance_token` | api.js interceptor |

## Auth (current behaviour)

`ProtectedRoute` does **not** enforce authentication. It injects a mock admin user into `localStorage` and allows all dashboard routes. Logout in the sidebar navigates to `/login`, which is not yet implemented.

See the root [`README.md`](../README.md) for the backend API contract the frontend expects.
