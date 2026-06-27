# Frontend

React dashboard, auth pages, and student portal for the Smart Attendance System.

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
| recharts | Charts |
| lucide-react | Icons |
| Vitest | Unit tests |

## Running locally

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Default dev server: http://localhost:5173

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (watch) |
| `npm run test -- --run` | Vitest single pass (CI) |

## Routes

### Public

| Path | Page |
|------|------|
| `/` | Landing page |
| `/login` | Login |
| `/signup` | Student signup |
| `/staff/signup` | Staff signup (requires registration key) |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |

### Staff dashboard (`/dashboard`)

Protected by JWT + permission checks via `ProtectedRoute`.

| Path | Page | Permission |
|------|------|------------|
| `/dashboard` | Dashboard home | `dashboard_view` |
| `/dashboard/profile` | Profile | `dashboard_view` |
| `/dashboard/live` | Live classroom | `live_sessions` |
| `/dashboard/students` | Student management | `manage_students` |
| `/dashboard/enrollment` | Face enrollment | `manage_students` |
| `/dashboard/courses` | Course management | `manage_courses` |
| `/dashboard/my-batch` | Counselor batch roster | `batches_read` |
| `/dashboard/alerts` | Alerts & intervention | `alerts` |
| `/dashboard/attention` | Attention analysis | `attention_read` |
| `/dashboard/reports` | Reports & logs | `reports_read` |
| `/dashboard/settings` | System settings | `system_admin` |

### Student portal

| Path | Page | Access |
|------|------|--------|
| `/portal` | Student portal | Role: `student` |

## Project structure

```
src/
├── components/
│   ├── analytics/     # AttentionBadge
│   ├── dashboard/     # Sidebar, Topbar, WebcamCapture, layouts
│   ├── landing/       # Landing page sections
│   ├── layout/        # ProtectedRoute, DashboardLayout
│   └── ui/            # Button, Card, Input, Badge, Tabs
├── config/
│   └── roles.js       # Permission matrix (mirrors backend)
├── pages/
│   ├── auth/          # Login, signup, password reset
│   ├── dashboard/     # All staff dashboard pages
│   ├── landing/       # LandingPage
│   └── portal/        # StudentPortal
├── services/
│   └── api.js         # Axios client with JWT interceptor
├── test/              # Vitest suites
├── App.jsx            # Route definitions
└── main.jsx           # Entry point
```

## Auth

- JWT stored in `localStorage` key `smart_attendance_token`
- User profile cached in `smart_attendance_user`
- `ProtectedRoute` validates token via `GET /auth/me` and enforces permissions
- Role-based redirect: students → `/portal`, staff → `/dashboard`

See [`docs/roles.md`](../docs/roles.md) for the full permission matrix.

## API integration

All dashboard pages use `src/services/api.js` against the FastAPI backend. Business data is persisted in PostgreSQL — there is no `localStorage` fallback for students, courses, or sessions.

## Tests

```bash
npm run test -- --run
```

| File | Covers |
|------|--------|
| `src/test/api.test.js` | Axios config and interceptors |
| `src/test/ProtectedRoute.test.jsx` | Auth guard and role redirects |
| `src/test/loginValidation.test.js` | Form validation |

See [`docs/testing_strategy.md`](../docs/testing_strategy.md).
