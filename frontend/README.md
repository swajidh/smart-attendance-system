Frontend
========

This directory will contain the Next.js (App Router) frontend for the smart attendance system, implemented in TypeScript and following the non-negotiable requirements.

Expected structure (no implementation code yet):

- `app/` – App Router routes and layouts
  - `(auth)/` – Authentication pages (e.g. login)
  - `(dashboard)/` – Protected dashboard and feature pages
- `components/`
  - `ui/` – Atomic UI components (Button, Input, Badge, Spinner)
  - `shared/` – Molecules (SearchBar, FormField, AlertToast)
  - `features/` – Organisms (Sidebar, DataTable, Notifications)
  - `layouts/` – Layout components (AppShell, PageWrapper)
- `hooks/` – Custom React hooks (all prefixed with `use`)
- `lib/`
  - `api/` – `apiClient` and per-resource query hooks
  - `config.ts` – Environment validation (per requirements)
  - `logger.ts` – Logging adapter
- `stores/` – Zustand stores for UI/global state
- `types/` – Shared TypeScript types and Zod schemas
- `utils/` – Pure utility functions
- `public/` – Static assets

Frontend
========

This directory will contain the web frontend for the smart attendance system.

Suggested substructure:

- `public/` – Static assets and the main HTML entrypoint
- `src/` – Application source code
  - `assets/` – Images and global styles
  - `components/` – Reusable UI components
  - `features/` – Feature-focused modules (auth, attendance, analytics, admin, etc.)
  - `pages/` – Routed pages or views
  - `hooks/` – Reusable React hooks (if applicable)
  - `services/` – HTTP/API clients
  - `store/` – Global state management
  - `routes/` – Route configuration
  - `utils/` – Utility helpers
  - `types/` – Shared TypeScript types (if using TS)
  - `config/` – Frontend-specific configuration

