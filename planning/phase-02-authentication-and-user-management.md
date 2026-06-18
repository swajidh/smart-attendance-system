# Phase 2 — Authentication & User Management (UAM)

> **Priority:** 🔴 Critical · **Est. effort:** 3–4 days
> **WBS coverage:** 4.0 (Module 1 — Authentication & User Management)
> **User stories:** UAM-01, UAM-02, UAM-03, UAM-04, UAM-05, UAM-06, UAM-07, SA-02, SAM-05
> **Depends on:** Phase 0 (auth route stub, dependency placeholders, access map), Phase 1 (`User` model, `get_db`).
> **Unblocks:** Every protected route in Phases 3–9; role-based access; student portal (Phase 9).
> **Index:** [overview](implementation-plan-overview.md)

---

## 1. Objective

Replace the mock-admin bypass with real JWT authentication and role-based access control, and ship the missing auth UI (login, signup, password reset). After this phase, access requires a valid token, roles are enforced server-side, and the frontend `ProtectedRoute` performs a real guard.

---

## 2. Entry State (baseline from `project-current-state.md`)

- **No real auth.** `frontend/src/components/layout/ProtectedRoute.jsx` injects a mock admin (`Demo Admin`, role `admin`) and a `temporary_mock_token`, then unconditionally renders `<Outlet />`.
- Auth routes are **commented out** in `App.jsx`; `frontend/src/pages/auth/` does not exist.
- `backend/app/api/v1/auth.py` is a 0-byte stub (Phase 0 left it importable but empty of routes).
- `frontend/src/services/api.js` already attaches `smart_attendance_token` and redirects to `/login` on 401 — but `/login` doesn't exist yet.
- `ProfilePage.jsx` already calls `GET /auth/me`, `PUT /auth/me`, `PUT /auth/me/avatar` (falls back to mock user). **UAM-03/UAM-07 frontend is partially done.**
- `Sidebar.jsx` filters nav by role from the mock user; logout navigates to non-existent `/login`.

---

## 3. Tasks

### 3.1 Backend (WBS 4.1)

- **2.1 Auth schemas (WBS 4.1.1)** → `backend/app/schemas/auth.py`, `backend/app/schemas/user.py`:
  - `LoginRequest(email, password)`, `RegisterRequest(email, password, name, role)`, `TokenResponse(access_token, token_type, user)`, `ForgotPasswordRequest(email)`, `ResetPasswordRequest(token, new_password)`.
  - `UserResponse(id, email, name, role, avatar_url, bio)`, `UserUpdate(name, bio)`, `RoleUpdate(role)`.
- **2.2 Auth service (WBS 4.1.2, 4.1.3)** → `backend/app/services/auth_service.py`:
  - `hash_password` / `verify_password` (passlib bcrypt).
  - `create_access_token` / `decode_access_token` (python-jose, expiry from `config.py`).
  - `generate_reset_token(email)` (24h) and `send_reset_email(email, token)` via `fastapi-mail`.
- **2.3 Auth middleware (WBS 4.1.4)** → `backend/app/middleware/auth.py` + fill `dependencies.get_current_user` / `require_role(*roles)` (the Phase 0 placeholders): OAuth2 bearer extraction → decode → load `User` → role check.
- **2.4 Auth routes (WBS 4.1.5)** → `backend/app/api/v1/auth.py`, registered via `router.py`:
  - `POST /auth/register` — admin creates teacher/counselor; student self-registers → **UAM-06**
  - `POST /auth/login` — email+password → JWT + user → **UAM-01**
  - `POST /auth/logout` — token invalidation/blacklist → **UAM-02**
  - `POST /auth/forgot-password` → **UAM-04**
  - `POST /auth/reset-password` → **UAM-04**
  - `GET /auth/me` → **UAM-01**
  - `PUT /auth/me` — name/bio → **UAM-03**
  - `PUT /auth/me/avatar` — validate JPEG/PNG ≤2MB → **UAM-07**
  - `GET /admin/users` — admin only → **UAM-05, SA-02, SAM-05**
  - `PUT /admin/users/{id}/role` — admin only → **UAM-05, SA-02, SAM-05**
- **2.5 RBAC enforcement (WBS 4.1.6).** Apply `Depends(get_current_user)` to all non-public routes and `require_role(...)` to admin/teacher/counselor-restricted ones. Establish the pattern that Phases 3–9 reuse.
- **2.6 Update seed** (from Phase 1) to hash the default admin password with the real `hash_password`.

### 3.2 Frontend (WBS 4.2)

- **2.7 Login page (WBS 4.2.1)** → `frontend/src/pages/auth/LoginPage.jsx`: email+password → `POST /auth/login` → store JWT in `smart_attendance_token` → redirect `/dashboard`. "Forgot Password?" link → **UAM-01, UAM-04**.
- **2.8 Signup page (WBS 4.2.2)** → `frontend/src/pages/auth/SignupPage.jsx`: student self-registration → `POST /auth/register` → **UAM-06**.
- **2.9 Forgot/Reset pages (WBS 4.2.3)** → `frontend/src/pages/auth/ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx` → **UAM-04**.
- **2.10 Real `ProtectedRoute` (WBS 4.2.4)** → replace mock injection in `ProtectedRoute.jsx`: read token, validate via `GET /auth/me`, redirect to `/login` if invalid. Remove the `temporary_mock_token` injection.
- **2.11 Restore auth routes in `App.jsx` (WBS 4.2.5)** → uncomment/add `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- **2.12 Wire `ProfilePage.jsx` (WBS 4.2.6)** → confirm live `/auth/me`, `PUT /auth/me`, `PUT /auth/me/avatar` now persist (backend exists). Remove mock-user fallback → **UAM-03, UAM-07**.
- **2.13 Role-based nav gating (WBS 4.2.7)** → `Sidebar.jsx` reads role from the real authenticated user; gate nav items per the `ui_ux_design.md` access map → **UAM-05**.
- **2.14 Logout flow (WBS 4.2.8)** → call `POST /auth/logout`, clear `smart_attendance_token`/`smart_attendance_user`, redirect to `/login` (now a real route) → **UAM-02**.

---

## 4. Contract Alignment Resolved Here

| Concern | Before | After this phase |
|---------|--------|------------------|
| `/login` route | redirected/commented; 404 on logout | Real page exists |
| `GET/PUT /auth/me`, `/auth/me/avatar` | called but no backend | Backend implemented; mock fallback removed |
| Token | `temporary_mock_token` static string | Real JWT from `/auth/login` |
| RBAC | sidebar-only, mock role | Server-enforced via `require_role` + sidebar gating |

---

## 5. Deliverables & Acceptance Criteria

- A user can register, log in, receive a JWT, access `/dashboard`, and be rejected (401 → `/login`) without a valid token.
- Password reset works end-to-end (email link → reset).
- `GET /admin/users` and role change work for admins and are forbidden (403) for non-admins.
- Profile edits and avatar upload persist to the database.
- Sidebar shows only role-permitted items based on the real user.
- No code path still injects the mock admin or `temporary_mock_token`.

---

## 6. Exit Criteria (Definition of Done)

1. All 10 auth routes return correct status codes and respect RBAC.
2. Frontend auth flow (login → protected dashboard → logout) works against the live backend with no `localStorage` mock-user fallback.
3. `require_role` / `get_current_user` are importable and used as the standard guard for subsequent phases.
4. Default admin from seed can log in.

---

## 7. Alignment Notes

- **Consumes:** Phase 1 `User` model + `get_db`; Phase 0 dependency placeholders, access map, route conventions.
- **Unblocks Phase 3–8:** every new route is protected via this phase's `get_current_user`/`require_role`. Student/course/session/report/admin endpoints assume an authenticated user and a role.
- **Unblocks Phase 9:** student self-registration (UAM-06) + role gating is the basis for the student portal's `/portal` routing.
- **Hands to Phase 10:** rate limiting on auth endpoints and HTTPS are deferred to security hardening (Phase 10); functional auth is complete here.
