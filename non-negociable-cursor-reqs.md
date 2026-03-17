# Engineering Requirements — Code Assistant Frontend
>Status: Non-Negotiable

---

## 1. Architecture (Non-Negotiable)

The application architecture is fixed and must not be changed without a formal RFC approved by the engineering lead.

### 1.1 Frontend Stack

| Concern | Decision |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict mode, no `any`) |
| Deployment | Static Export (`output: 'export'` in `next.config.ts`) |
| Deployment Target | Azure Static Web Apps (or equivalent static host) |
| Server-side Rendering | **Prohibited** — no SSR, no Route Handlers returning dynamic data |

### 1.2 Static Export Constraints

- All data fetching must be **client-side only** (React Query / SWR inside `useEffect` or hooks).
- No `getServerSideProps`, no `getStaticProps` with `revalidate`, no dynamic Route Handlers.
- All environment variables must use the `NEXT_PUBLIC_` prefix — they are baked in at build time.
- Azure SWA rewrite rules must be configured so that all routes fall back to `index.html` for client-side routing to function correctly.

```json
// staticwebapp.config.json (required)
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/api/*"]
  }
}
```

---

## 2. Hydration (Non-Negotiable)

Hydration errors are treated as build-breaking bugs.

### 2.1 Rules

- **No browser API access at module level.** `window`, `document`, `localStorage`, `navigator`, and `Date` (when used for rendering) must only be accessed inside `useEffect` or a client-side hook.
- **Client-only components** must be wrapped with `dynamic(() => import(...), { ssr: false })`.
- **No `useLayoutEffect`** without a `typeof window !== 'undefined'` guard — or use `useIsomorphicLayoutEffect`.
- **`suppressHydrationWarning`** is permitted only on elements whose content is intentionally different server/client (e.g., timestamps). It must not be used to silence real mismatches.
- Date/time rendering must use a `useHydrated()` hook to defer until the client is mounted.

### 2.2 Checklist Before Every Component Merge

- [ ] No `window` / `document` / `localStorage` access at render time
- [ ] Any `dynamic(...)` import has `{ ssr: false }` if it uses browser APIs
- [ ] No `Math.random()` or `Date.now()` in rendered output

---

## 3. UI / UX Requirements (Non-Negotiable)

### 3.1 Design Language — Glassmorphism

The application must follow a **modern Glassmorphism** design language throughout. This is not a theme option — it is the base visual contract for every surface.

| Element | Requirement |
|---|---|
| Cards | Frosted glass effect — `backdrop-filter: blur(12–20px)` with semi-transparent background |
| Panels | Translucent layered surfaces — light/dark alpha backgrounds, never fully opaque |
| Borders | Subtle — 1px, low-opacity white or color with slight luminance |
| Shadows | Soft, diffused — no harsh drop shadows |
| Feel | Premium and modern — never utilitarian or flat-minimal |

**Implementation rules:**

```css
/* Reference token values — defined in tailwind.config.ts */
--glass-bg-light: rgba(255, 255, 255, 0.15);
--glass-bg-dark:  rgba(15, 15, 25, 0.45);
--glass-blur:     blur(16px);
--glass-border:   1px solid rgba(255, 255, 255, 0.18);
--glass-shadow:   0 8px 32px rgba(0, 0, 0, 0.12);
```

- `backdrop-filter` must always be paired with a semi-transparent `background` — never blur without alpha.
- Backdrop blur must be applied at the component level, not globally on the page.
- Glass layers must have visible depth separation — foreground panels must be visually distinct from background panels.
- `will-change: transform` must be applied to glass elements that animate to avoid repaint thrashing.
- Glassmorphism must degrade gracefully: wrap in `@supports (backdrop-filter: blur(1px))` with an opaque fallback for unsupported browsers.

```css
/* Required fallback pattern */
@supports not (backdrop-filter: blur(1px)) {
  .glass-card {
    background: var(--fallback-surface); /* fully opaque */
  }
}
```

### 3.2 Responsiveness

The UI must be **fully responsive** across all three device classes. No layout may break, overflow, or clip at any standard viewport size.

| Device class | Viewport range | Tailwind prefix |
|---|---|---|
| Mobile | 320px – 639px | (default, no prefix) |
| Tablet | 640px – 1023px | `sm:` / `md:` |
| Desktop | 1024px+ | `lg:` / `xl:` |

- All breakpoints must be implemented using **Tailwind responsive prefixes only** — no custom media queries in component files.
- Touch targets on mobile must be minimum 44×44px.
- Glass blur intensity may be reduced on mobile (`blur(8px)`) to account for GPU constraints.
- No horizontal scroll at any breakpoint — content must reflow, not overflow.
- Navigation must collapse to a mobile drawer or bottom-nav pattern below `md:`.

### 3.3 Dark / Light Mode (Non-Negotiable)

Both modes must be implemented, fully tested, and visually correct. Mode is **not** optional.

| Requirement | Spec |
|---|---|
| Storage | `localStorage` key `theme` — values `'dark'` \| `'light'` \| `'system'` |
| Restoration | Preference applied before first paint — inject into `<html>` via inline script in `<head>` to prevent flash |
| Toggle | Visible toggle switch in the global header, accessible via keyboard |
| Transition | `transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease` on root — no jarring flips |
| System default | Respect `prefers-color-scheme` when preference is `'system'` or unset |

**Flash-of-wrong-theme prevention (required):**

```html
<!-- Must be the first script in <head>, before any CSS or React hydration -->
<script>
  (function () {
    var stored = localStorage.getItem('theme');
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.add(
      stored === 'dark' || (!stored && dark) ? 'dark' : 'light'
    );
  })();
</script>
```

- Dark mode glass variables must be darker and more saturated than light mode — not just inverted colors.
- Text contrast must meet WCAG AA in **both** modes independently.
- All screenshots in PR reviews must show both modes.

### 3.4 UI States (Mandatory — Every Component)

Every component that renders data must implement all four states. A component that renders blank UI in any state is a bug and will be rejected in code review.

| State | Required behaviour |
|---|---|
| **Loading** | Skeleton (preferred) or spinner if load > 3s expected. Skeleton must match the shape of loaded content. |
| **Empty** | Illustrated empty state with a short message and a suggested action. Never blank space. |
| **Error** | Inline error with a retry action. Critical errors surface a modal. All errors also fire a toast. |
| **Success** | Data rendered correctly — includes populated, paginated, and filtered views. |

```typescript
// Every data component must implement this shape
// Skeleton must mirror the real layout — not a generic spinner
// Empty state must include: icon + headline + subtext + optional CTA
// Error state must include: user-safe message + retry button + logged error
type ComponentState = 'loading' | 'empty' | 'error' | 'success';
```

### 3.5 Error Surfacing — UI Layer

Frontend must surface errors through structured UI — never silently swallow them or log to console only.

| Error type | Primary surface | Secondary surface |
|---|---|---|
| API failure (non-auth) | Toast notification (error) | Inline error in the affected component |
| Auth / OAuth failure | Modal alert (blocking) | Redirect to login with message |
| Data loading failure | Inline error with retry | Toast notification |
| Form validation | Inline field error | None |
| Critical / unrecoverable | Full-page error boundary | Error reporting service |

- Error messages shown to users must be **human-readable** — never raw error objects, stack traces, or HTTP status codes.
- A `useErrorHandler()` hook must be the standard way for components to report errors to the notification system.

### 3.6 Notification System — UI Layer

The notification system is the **only** permitted mechanism for surfacing events to users. `console.log` is not a user notification.

| Event type | Variant | Auto-dismiss |
|---|---|---|
| Success (save, submit, etc.) | `success` toast | 5 000ms |
| Warning (degraded state, etc.) | `warning` toast | 8 000ms |
| Error (non-critical) | `error` toast | Never — user must dismiss |
| Info (background update, etc.) | `info` toast | 5 000ms |
| Critical error | `error` modal | Never — user must confirm |

Additional rules:
- Toasts stack vertically — bottom-right on desktop, bottom-center on mobile.
- Maximum 3 toasts visible simultaneously — overflow is queued.
- All toasts dismissible via close button and keyboard (`Escape`).
- Toast and modal glass styling must match the Glassmorphism theme.

## 4. Component Architecture

### 4.1 Reusability

All UI components must be reusable and follow **Atomic Design** levels:

| Level | Location | Examples |
|---|---|---|
| Atom | `components/ui/` | Button, Input, Badge, Icon, Spinner |
| Molecule | `components/shared/` | SearchBar, FormField, AlertToast |
| Organism | `components/features/` | Sidebar, DataTable, Notifications |
| Layout | `components/layouts/` | AppShell, PageWrapper |

- **No prop drilling beyond 2 levels.** Use context or a state manager.
- Every shared component must have a documented props interface (TSDoc comments minimum).
- Components must not hardcode API endpoints, colors, or copy — all must be props or config.

### 4.2 Consistent Menus

- Navigation menus must share a **single source of truth** — one component rendered everywhere.
- Menus must be **API-drivable** via a menu config schema (see Section 8.2).
- Active state, badge counts, disabled states, and icons must all be derivable from API data.
- Menu structure must not be duplicated across pages.

### 4.3 Notifications & Alerts

Notifications and alerts must be driven by a centralized store and support API-injected content.

| Property | Spec |
|---|---|
| Types | `info`, `success`, `warning`, `error` |
| Display modes | Toast (auto-dismiss), Banner (persistent), Inline |
| Max visible toasts | 3 (queue the rest) |
| Auto-dismiss delay | 5000ms (error: never auto-dismiss) |
| Persistence | Survive in-app navigation, clear on logout |
| API-injectable | Yes — any service can push a notification via the notification store |

---

## 5. Data Fetching

### 5.1 Standard Pattern

Use **React Query (TanStack Query)** as the standard for all server state. SWR is acceptable for simple use cases. Raw `useEffect` + `fetch` is only acceptable for one-off side effects.

```typescript
// CORRECT — all data fetching follows this shape
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => apiClient.get(`/resource/${id}`),
  retry: 2,
  staleTime: 1000 * 60 * 5,
});

// Every component that fetches must handle all three states
if (isLoading) return <ResourceSkeleton />;
if (isError)   return <ErrorFallback error={error} />;
return <ResourceView data={data} />;
```

### 5.2 API Client Contract

A single `apiClient` wrapper must be used for all HTTP requests. Direct `fetch()` calls outside this wrapper are not permitted.

The client must implement:

- **Base URL** from `NEXT_PUBLIC_API_BASE_URL` (validated at startup)
- **Auth headers** injected automatically from the token store
- **Request timeout**: 30 seconds default, configurable per-call
- **Retry logic**: 2 retries on 5xx, no retry on 4xx
- **Request cancellation** via `AbortController` (cancel on component unmount)
- **Response validation** via Zod schemas — responses that fail validation throw a typed error
- **Logging**: every request and response logged (see Section 10)

```typescript
// Minimal shape — implementation in `lib/api/client.ts`
interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}
```

### 5.3 Loading States

Every component that loads data must implement a loading skeleton, not a spinner, unless the load time is expected to exceed 3 seconds. No component may render in an indeterminate state (either loading or data must be shown — never empty without explanation).

---

## 6. Environment Configuration

### 6.1 Required Variables

All environment variables must be declared in `.env.example` with descriptions. Missing required variables must cause a startup error, not a silent failure.

```bash
# Required — app will not start without these
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_APP_ENV=development|staging|production

# Optional — feature flags
NEXT_PUBLIC_FEATURE_X=false
```

### 6.2 Validation at Startup

Validate all required env vars in `lib/config.ts` before the app tree mounts:

```typescript
const requiredVars = ['NEXT_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_APP_ENV'] as const;
requiredVars.forEach(key => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
});
```

---

## 7. State Management

### 7.1 Decision Matrix

| State type | Tool |
|---|---|
| Server / async state | React Query |
| Global UI state (auth, theme, notifications) | Zustand |
| Local component state | `useState` / `useReducer` |
| Form state | React Hook Form |
| URL state | `useSearchParams` (Next.js) |

### 7.2 Rules

- **Never mix server state into UI stores.** Zustand stores must not cache API responses — that is React Query's job.
- **Store shape must be typed** — no untyped Zustand slices.
- **Stores must be hydrated safely** — no direct `localStorage` reads in store initializers (use `persist` middleware with a `skipHydration` pattern).

---

## 8. API-Driven UI Contracts

### 8.1 General Principle

Any UI element listed as "API-drivable" must function correctly with any conforming API response, including empty arrays, null values, and additional unknown fields (forward-compatible).

### 8.2 Menu Schema

```typescript
interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;           // icon name from the icon system
  badgeCount?: number;     // shown as a numeric badge
  badgeVariant?: 'info' | 'warning' | 'error';
  disabled?: boolean;
  hidden?: boolean;        // hide item without removing from DOM
  children?: MenuItem[];   // for nested menus (max 2 levels)
  requiredPermission?: string;
}

interface MenuConfig {
  items: MenuItem[];
  updatedAt: string;       // ISO timestamp — used to bust local cache
}
```

### 8.3 Notification Schema

```typescript
interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  autoDismiss?: boolean;
  action?: { label: string; href: string };
  createdAt: string;
}
```

---

## 9. Authentication & Route Protection

### 9.1 Token Storage

| Option | Decision |
|---|---|
| Access token | In-memory only (Zustand store, not localStorage) |
| Refresh token | `HttpOnly` cookie (set by backend) |
| On page refresh | Re-authenticate via silent refresh endpoint |

Storing access tokens in `localStorage` or `sessionStorage` is **prohibited** (XSS risk).

### 9.2 Route Guards

- All protected routes must be wrapped in a `<AuthGuard>` component.
- `AuthGuard` must redirect to `/login` with a `returnTo` query param on unauthenticated access.
- Guards must handle the loading state (show skeleton, not redirect) while auth status is resolving.

---

## 10. Logging

### 10.1 Log Levels

| Level | When to use |
|---|---|
| `debug` | Dev-only verbose output — stripped in production builds |
| `info` | Normal application events (route change, feature flag evaluated) |
| `warn` | Recoverable issues (API retry, fallback triggered) |
| `error` | Exceptions, failed requests, boundary catches |

### 10.2 What Must Always Be Logged

- Every API request: method, URL, request ID (generated client-side), timestamp
- Every API response: status code, duration, request ID
- Every error boundary catch: component stack, error message, route
- Every form validation failure at submission (type only, no PII field values)
- Every navigation event in production

### 10.3 PII Rules

Log entries must **never** contain:
- Passwords, tokens, or secrets
- Full names, emails, or phone numbers
- Any field value from a form input (log field names only)

### 10.4 Log Destination

| Environment | Destination |
|---|---|
| Development | `console.*` |
| Staging / Production | External service (e.g., Azure Monitor, Sentry) via `lib/logger.ts` adapter |

---

## 11. Error Handling

### 11.1 Error Boundary Hierarchy

```
<RootErrorBoundary>          ← catches everything, shows full-page fallback
  <AppShell>
    <PageErrorBoundary>      ← per-page, shows page-level fallback
      <FeatureErrorBoundary> ← per-feature widget, shows inline fallback
```

- Every boundary must log the error and component stack to the logger.
- Boundary fallback UIs must include a "Try again" reset action.
- Boundaries must report to the error tracking service in non-development environments.

### 11.2 API Error Handling

All API errors must be typed. The client must distinguish:

| Error type | Behavior |
|---|---|
| `NetworkError` | Show retry UI, log warning |
| `AuthError` (401) | Clear tokens, redirect to login |
| `ForbiddenError` (403) | Show permission denied message |
| `NotFoundError` (404) | Show not found fallback |
| `ValidationError` (422) | Map field errors to form fields |
| `ServerError` (5xx) | Show error UI, retry with backoff, log error |

### 11.3 Unhandled Rejection Catch

A global `window.addEventListener('unhandledrejection', ...)` handler must be registered in `app/layout.tsx` to catch and log any promises that escape component error boundaries.

---

## 12. React Best Practices (Non-Negotiable)

### 12.1 Hooks

- All data fetching must go through custom hooks — no raw `useQuery`/`fetch` calls directly in component bodies.
- Custom hooks must be located in `hooks/` and have a name starting with `use`.
- `useEffect` dependency arrays must be complete and accurate — no suppression of `exhaustive-deps` ESLint warnings without a documented exception comment.
- No uncontrolled side effects — every `useEffect` that sets up a subscription, timer, or listener must return a cleanup function.
- `useCallback` and `useMemo` must only be used when there is a measurable performance reason — not by default.

### 12.2 Render Performance

- No unnecessary re-renders — components that receive stable props must not re-render on parent updates. Use `React.memo` where this is measured and proven beneficial.
- State must be as local as possible — do not hoist state to a parent unless it is genuinely shared.
- No duplicated state — if a value can be derived from existing state or props, it must not be stored in a separate `useState`.
- Lists must always have a stable, unique `key` prop — never use array index as key for dynamic lists.

### 12.3 API Calls

- **Avoid redundant API calls** — React Query's caching is the primary mechanism. Do not call the same endpoint from multiple components; use a shared query hook.
- **Centralized data fetching** — API calls belong in hooks in `hooks/`, not in page components or utility functions.
- All API calls must be cancellable via `AbortController` — passed through the `apiClient` (see Section 5.2).
- Do not fetch data that is already available in the React Query cache.

### 12.4 Code Quality Rules

| Rule | Enforcement |
|---|---|
| No `any` type | `tsc --strict` (CI gate) |
| No unused variables | ESLint `no-unused-vars` |
| No `console.log` in production | ESLint `no-console` (warn in dev, error in CI) |
| No `eslint-disable` without comment | ESLint rule |
| Consistent import order | `eslint-plugin-import` |
| No default export from hooks | Convention enforced in PR review |

---

## 13. Forms

- **Library**: React Hook Form (required)
- **Validation schema**: Zod (required) — schemas shared between form and API response validation
- **Validation timing**: On blur (field-level) + on submit (full form)
- **API error mapping**: Backend `ValidationError` field errors must be mapped to React Hook Form `setError()` calls
- **Submission state**: All forms must disable the submit button and show a loading indicator during submission
- **Accessibility**: All inputs must have associated `<label>` elements and ARIA descriptions for errors

---

## 14. Styling

| Concern | Decision |
|---|---|
| Utility framework | Tailwind CSS (required) |
| Component variants | `cva` (class-variance-authority) |
| Theming | CSS custom properties — light and dark mode required |
| Design tokens | Defined in `tailwind.config.ts` — no hardcoded color hex values in components |
| Responsive breakpoints | Mobile-first: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px) |
| Icon system | Single icon library (Lucide) — no mixing libraries |
| Glassmorphism tokens | Defined as CSS custom properties in `globals.css`, consumed via Tailwind plugin |

### 14.1 Rules

- **No inline CSS** — `style={{}}` is prohibited except for dynamic values that cannot be expressed as utilities (e.g., programmatic `backdropFilter` values).
- **No component-level CSS files** — all styling via Tailwind utility classes. `globals.css` is the only permitted CSS file, used only for: CSS custom property definitions, `@font-face`, and base resets.
- **Prefer utility classes** — never recreate a utility Tailwind already provides.
- **No hardcoded color hex values** inside components — all colors must reference a design token from `tailwind.config.ts`.
- All Glassmorphism values (blur, alpha, border) must be sourced from CSS custom properties — not hardcoded per-component.
- `cva` must be used for any component with more than one visual variant (e.g., Button: primary / secondary / ghost / danger).

### 14.2 Charting

| Concern | Decision |
|---|---|
| Library | Recharts (preferred) or Chart.js — one library only, no mixing |
| Responsiveness | All charts must use `ResponsiveContainer` (Recharts) or `maintainAspectRatio: false` (Chart.js) |
| Theming | Charts must consume CSS custom properties for colors — no hardcoded palette |
| Glass integration | Chart containers must use the standard glass card treatment |
| Empty state | Charts must render a styled empty state, not an empty SVG/canvas |
| Loading state | Charts must render a skeleton that matches the chart shape |

- Chart color palettes must be defined in `tailwind.config.ts` and pulled from CSS variables — charts must look correct in both light and dark mode.
- Tooltips must match the Glassmorphism theme (glass background, subtle border).
- No chart may be added without a responsive wrapper — a chart that overflows its container will be rejected in review.

---

## 15. Accessibility (a11y)

- **Target**: WCAG 2.1 Level AA
- All interactive elements must be keyboard navigable and have visible focus rings
- Color contrast ratio: minimum 4.5:1 for body text, 3:1 for large text and UI components
- All images must have `alt` text; decorative images use `alt=""`
- Dialogs and modals must trap focus and restore focus on close
- Route changes must announce the new page title to screen readers
- ARIA roles required on: navigation menus, alerts, toasts, modal dialogs, and data tables
- `axe-core` or equivalent must be run in CI and must not introduce new violations

---

## 16. Performance

| Metric | Target |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| INP (Interaction to Next Paint) | < 200ms |
| JS bundle (initial, gzipped) | < 200KB |
| API response timeout | 30s (user-facing feedback after 5s) |

### 16.1 Rules

- All images must use `next/image` with explicit `width` and `height` — no layout shift from images
- Route-based code splitting is automatic (App Router) — do not import feature code into the root layout
- Third-party scripts must be loaded with `next/script` using `strategy="lazyOnload"` or `"afterInteractive"`
- Web fonts must use `next/font` with `display: swap`

---

## 17. Testing

### 17.1 Requirements

| Type | Tool | Minimum Coverage |
|---|---|---|
| Unit | Vitest | 80% for `lib/` and `hooks/` |
| Component | Testing Library + Vitest | All shared `components/ui/` components |
| Integration | Testing Library | All forms, all API hooks |
| E2E | Playwright | All critical user flows (login, core feature, error states) |

### 17.2 What Must Be Tested

- All custom hooks that wrap API calls
- All Zod schemas (valid and invalid inputs)
- All error boundary renders
- All form validations (valid submission, field errors, API errors)
- All auth guard redirect behaviors
- All menu and notification rendering from mock API data

---

## 18. Security

- No secrets or API keys in client-side code or environment variables other than `NEXT_PUBLIC_*` (which must not contain secrets)
- Content Security Policy headers set in `staticwebapp.config.json`
- All external links must open with `rel="noopener noreferrer"`
- `dangerouslySetInnerHTML` is **prohibited** without a security review exception
- `npm audit` must pass with no high or critical vulnerabilities — this is a CI gate
- Dependencies must be pinned to exact versions in `package.json`

---

## 19. CI/CD Pipeline

### 19.1 Gates — All Must Pass Before Deploy

```
1. Type check        → tsc --noEmit (zero errors)
2. Lint              → ESLint (zero errors, warnings reviewed)
3. Unit tests        → Vitest (coverage thresholds enforced)
4. E2E smoke tests   → Playwright (critical path only, fast)
5. Security audit    → npm audit (no high/critical)
6. a11y check        → axe-core (no new violations)
7. Build             → next build (zero errors, zero warnings)
```

### 19.2 Environments

| Environment | Trigger | Notes |
|---|---|---|
| Development | Local | `.env.local` |
| Preview | PR open | Deployed to a preview URL, runs full test suite |
| Staging | Merge to `main` | Full suite + E2E |
| Production | Manual approval | Requires staging sign-off |

### 19.3 Rollback

Production deployments must retain the previous 3 build artifacts. Rollback must be achievable by redeploying a previous artifact without a code change.

---

## 20. Internationalisation (i18n)

i18n is **out of scope** for the initial release. The following constraints apply to keep the door open:

- All user-facing strings must be in English
- Do not hardcode strings inline in JSX — use a `t()` function or constant even if not yet wired to a translation system
- Date, number, and currency formatting must use `Intl` APIs, not hardcoded formats
- RTL layouts are not required but components must not use directional CSS values (`margin-left`, `padding-right`) — use logical properties (`margin-inline-start`, `padding-inline-end`)

---

## 21. Definitions

| Term | Meaning |
|---|---|
| Non-negotiable | Cannot be changed without engineering lead approval and a documented RFC |
| Prohibited | Never do this — raising a PR with this pattern will be rejected |
| Required | Must be implemented — not optional |
| Recommended | Strong preference; deviation requires a comment explaining why |
| API-drivable | The component's content, state, or structure can be fully controlled by API response data |


---

## 22. Backend Engineering (Non-Negotiable)

### 22.1 Runtime & Stack

| Concern | Decision |
|---|---|
| Language | Python 3.12 (pinned in `.python-version`, `pyproject.toml`, and Dockerfile) |
| Framework | FastAPI |
| ASGI server | Uvicorn with Gunicorn workers (`gunicorn -k uvicorn.workers.UvicornWorker`) |
| Package manager | Poetry (required) — `poetry.lock` must be committed |
| Type checker | Mypy (strict mode) — CI gate |
| Linter / formatter | Ruff (replaces flake8 + isort + black) — CI gate |

All endpoints must use `async def`. Synchronous endpoints are prohibited — they block the event loop and defeat the purpose of FastAPI's async model.

### 22.2 Pydantic Models & Input Validation

Every request body, query parameter set, and response must be a typed Pydantic v2 model. Raw `request.json()` access and untyped `dict` parameters are prohibited.

```python
# CORRECT — every endpoint uses typed models
class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    assignee_id: UUID4 | None = None

class TaskResponse(BaseModel):
    id: UUID4
    title: str
    created_at: datetime

@router.post("/tasks", response_model=ApiResponse[TaskResponse], status_code=201)
async def create_task(body: CreateTaskRequest, db: AsyncSession = Depends(get_db)):
    ...
```

- Pydantic validation failures automatically return `422 Unprocessable Entity` with field-level detail — do not catch and swallow these.
- All response models must be declared on the endpoint (`response_model=`) so OpenAPI schema is accurate.
- Use `model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")` on all request models — reject unknown fields.

### 22.3 Response Envelope (Non-Negotiable)

All endpoints must return a consistent typed envelope. The frontend depends on this contract.

```python
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None          # human-readable message
    code: str | None = None           # machine-readable error code, e.g. "SLACK_TOKEN_EXPIRED"
    details: str | None = None        # optional extra context
    request_id: str | None = None     # always populated by middleware

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    meta: PaginationMeta
    request_id: str | None = None

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
```

```json
// Success — single resource
{ "success": true, "data": { "id": "...", "title": "..." }, "request_id": "uuid" }

// Success — list
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 84, "total_pages": 5 }, "request_id": "uuid" }

// Error
{ "success": false, "error": "Slack integration failed", "code": "SLACK_TOKEN_EXPIRED", "details": "OAuth token expired at 2026-03-10T14:22:00Z", "request_id": "uuid" }
```

- Never return `200` for a failure.
- `request_id` must be populated on every response by the request ID middleware — not manually per endpoint.
- The `code` field must be a snake_case constant string — never a raw exception class name.

### 22.4 HTTP Status Codes

| Code | Meaning | When to use |
|---|---|---|
| `200` | OK | GET, PUT success |
| `201` | Created | POST that creates a resource |
| `204` | No Content | DELETE success (no response body) |
| `400` | Bad Request | Business logic validation failure (not Pydantic) |
| `401` | Unauthorized | Missing or invalid auth token |
| `403` | Forbidden | Authenticated but insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Duplicate resource, version conflict |
| `422` | Unprocessable Entity | Pydantic input validation failure (automatic) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unhandled exception |
| `503` | Service Unavailable | Critical dependency (DB, external API) is down |

Never return `200` for failures. Never return `500` for a client error.

### 22.5 Exception Handling

All exceptions must be caught by registered global handlers and returned as structured envelopes. FastAPI's default HTML error page must never reach the client.

```python
# Register in app factory — app/main.py
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content=ApiResponse(
        success=False,
        error="Validation failed",
        code="VALIDATION_ERROR",
        details=str(exc.errors()),
        request_id=request.state.request_id,
    ).model_dump())

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    logger.error("AppException", extra={"code": exc.code, "detail": exc.detail, "request_id": request.state.request_id})
    return JSONResponse(status_code=exc.status_code, content=ApiResponse(
        success=False, error=exc.message, code=exc.code, request_id=request.state.request_id,
    ).model_dump())

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception", extra={"request_id": request.state.request_id})
    return JSONResponse(status_code=500, content=ApiResponse(
        success=False, error="An unexpected error occurred", code="INTERNAL_ERROR",
        request_id=request.state.request_id,
    ).model_dump())
```

All application-specific exceptions must extend a base `AppException` class with `status_code`, `message`, and `code` fields. Raising raw `Exception` inside endpoint logic is prohibited.

### 22.6 Request ID Middleware (Required)

A request ID must be generated for every incoming request, stored in request state, included in all log lines, and returned in the `X-Request-ID` response header.

```python
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
```

This middleware must be the first middleware registered on the app.

### 22.7 Logging

**Format:** All logs must be JSON-structured (use `python-json-logger` or equivalent). Plain-text logs are not acceptable in production.

**Required fields on every log line:**

| Field | Value |
|---|---|
| `timestamp` | ISO 8601 UTC (`2026-03-13T14:22:00.123Z`) |
| `level` | `INFO` \| `WARNING` \| `ERROR` \| `DEBUG` |
| `request_id` | From request state — populated by middleware |
| `endpoint` | Route path pattern (e.g. `/api/v1/tasks/{id}`) |
| `method` | HTTP method |
| `duration_ms` | Request duration in milliseconds |
| `user_id` | Authenticated user ID if available, else `null` |
| `error` | Error message (ERROR level only) |

**Log levels:**

| Level | When to use |
|---|---|
| `DEBUG` | Dev-only verbose output — disabled in staging and production |
| `INFO` | Request received, request completed, external call made |
| `WARNING` | Retry attempted, rate limit approached, fallback triggered |
| `ERROR` | Exception caught, external call failed, auth failure |

**PII rules:** Log entries must never contain passwords, tokens, full names, email addresses, or field values from user input. Log field names, not values.

**Destination:**

| Environment | Destination |
|---|---|
| Development | `stdout` (plain text acceptable) |
| Staging / Production | `stdout` JSON — ingested by Azure Monitor / Log Analytics |

### 22.8 Authentication & Authorization

| Decision | Spec |
|---|---|
| Token type | JWT (signed with RS256) |
| Validation | FastAPI dependency (`get_current_user`) injected per route |
| Token location | `Authorization: Bearer <token>` header only — no cookie auth |
| Expiry | Access token: 15 minutes. Refresh token: 7 days. |
| Refresh endpoint | `POST /api/v1/auth/refresh` — returns new access token |
| Permission model | Role-based — roles attached to the decoded JWT claims |

```python
# Standard auth dependency — inject on protected routes
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    ...  # decode JWT, validate expiry, load user from DB
    # raises 401 if token invalid or expired
    # raises 403 if user is inactive

# Usage
@router.get("/tasks", response_model=ApiResponse[list[TaskResponse]])
async def list_tasks(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ...
```

- Never pass auth tokens in query parameters or URL paths.
- Token validation must happen in the dependency, not inside endpoint logic.

### 22.9 CORS

CORS must be configured using `fastapi.middleware.cors.CORSMiddleware`. Allowed origins must be environment-specific.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,   # list from env — never ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)
```

`allow_origins=["*"]` is **prohibited** in staging and production environments.

### 22.10 Rate Limiting

Rate limiting must be implemented using `slowapi`. Limits must be defined per endpoint or per router, not globally only.

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)  # key by IP for public; by user ID for authenticated

@router.post("/integrations/slack/connect")
@limiter.limit("10/minute")
async def connect_slack(request: Request, ...):
    ...
```

| Endpoint category | Default limit |
|---|---|
| Auth endpoints (login, refresh) | 5 / minute per IP |
| Write endpoints (POST, PUT, DELETE) | 30 / minute per user |
| Read endpoints (GET) | 120 / minute per user |
| Webhook / integration triggers | 10 / minute per IP |

Rate limit responses must use the structured envelope with `code: "RATE_LIMIT_EXCEEDED"` and include `Retry-After` header.

### 22.11 Environment Configuration

All configuration must be loaded via `pydantic-settings`. No `os.getenv()` calls scattered through the codebase — all config reads go through the `Settings` singleton.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Required — app will not start without these
    DATABASE_URL: PostgresDsn
    SECRET_KEY: str
    ALLOWED_ORIGINS: list[str]
    APP_ENV: Literal["development", "staging", "production"]

    # Optional
    LOG_LEVEL: str = "INFO"
    RATE_LIMIT_ENABLED: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()  # fails fast if required vars are missing
```

Secrets (API keys, DB passwords, OAuth credentials) must be injected via environment variables in production — never committed to source control. Use Azure Key Vault for production secret management.

### 22.12 Database

| Concern | Decision |
|---|---|
| Database | PostgreSQL (required for production) |
| ORM | SQLAlchemy 2.x async (`asyncpg` driver) |
| Migrations | Alembic — all schema changes via migration files, never `create_all()` in production |
| Connection pool | Min 5, max 20 connections — configurable via env |
| Query timeout | 30 seconds maximum per query |

```python
# Async DB session dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

- Raw SQL is permitted only for complex analytical queries — must use parameterised queries, never f-strings in SQL.
- All models must have a `created_at` and `updated_at` timestamp column with server-side defaults.
- Soft delete (`deleted_at` column) is preferred over hard delete for user-facing entities.

**Index rules:**

- Every foreign key column must have a database index.
- Every column used in a `WHERE`, `ORDER BY`, or `JOIN` condition in more than one query must have an index.
- Composite indexes must be ordered by cardinality (highest-cardinality column first).
- Indexes must be added via Alembic migrations — never manually applied to production.
- Unused indexes must be removed — they slow writes without helping reads.

**N+1 query prevention (required):**

N+1 queries are a build-blocking bug. Every endpoint that returns a list of objects with related data must use eager loading.

```python
# WRONG — N+1: issues one query per task to load the assignee
tasks = await db.execute(select(Task))
for task in tasks.scalars():
    print(task.assignee.name)  # triggers a new query per row

# CORRECT — eager load with selectinload
tasks = await db.execute(
    select(Task).options(selectinload(Task.assignee), selectinload(Task.tags))
)
```

- Use `selectinload` for one-to-many relationships.
- Use `joinedload` for many-to-one / one-to-one relationships.
- Use `contains_eager` when you need to filter on the related model.
- Every new endpoint returning related data must be reviewed for N+1 in code review.

### 22.13 External Integration Error Handling

All calls to external services (Slack, OAuth providers, AI APIs, email, etc.) must follow this pattern:

```python
async def call_slack_api(endpoint: str, payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"https://slack.com/api/{endpoint}",
                json=payload,
                headers={"Authorization": f"Bearer {settings.SLACK_TOKEN}"},
            )
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        logger.warning("Slack API timeout", extra={"endpoint": endpoint})
        raise AppException(status_code=503, message="Slack is not responding", code="SLACK_TIMEOUT")
    except httpx.HTTPStatusError as e:
        logger.error("Slack API error", extra={"status": e.response.status_code, "endpoint": endpoint})
        raise AppException(status_code=502, message="Slack integration failed", code="SLACK_ERROR", detail=str(e))
```

| Rule | Spec |
|---|---|
| Timeout | 10 seconds per external call — never unlimited |
| Retry | 2 retries with exponential backoff on 5xx and timeout, no retry on 4xx |
| Circuit breaker | Use `tenacity` for retry logic |
| HTTP client | `httpx` (async) — `requests` is prohibited in async context |
| Error propagation | Always map to `AppException` — never let raw `httpx` exceptions reach the endpoint |

**OAuth integration rules:**

- Store OAuth access tokens encrypted at rest — never in plaintext in the database.
- Token refresh must be handled transparently by the integration layer — endpoints must not receive expired token errors.
- Revoke tokens on user disconnect or logout from the integration.
- Never expose OAuth client secrets to the frontend.

**Webhook integration rules:**

- Every inbound webhook must verify the provider's signature before processing (e.g. Slack `X-Slack-Signature`, GitHub `X-Hub-Signature-256`).
- Signature verification must happen before any business logic — reject unsigned webhooks with `403`.
- Webhook handlers must return `200` immediately and process the payload asynchronously via background task.
- Duplicate webhook delivery must be handled with idempotency keys.

**AI API integration rules:**

- AI API calls (OpenAI, Anthropic, Azure OpenAI, etc.) must always set an explicit `max_tokens` limit.
- Streaming responses must be proxied correctly — do not buffer the full response before forwarding.
- AI API costs must be tracked per request (log token usage on every call).
- AI API errors (content filter, context length, rate limit) must each map to a distinct `AppException` code.

### 22.14 Background Tasks

For operations expected to exceed 5 seconds (AI inference, report generation, bulk operations), use async background processing — never make the HTTP response wait.

| Workload | Tool |
|---|---|
| Lightweight (< 30s, fire-and-forget) | FastAPI `BackgroundTasks` |
| Heavy / durable / retriable | Celery + Redis |

Endpoints that trigger background work must return immediately with `202 Accepted` and a `job_id`:

```python
@router.post("/reports/generate", status_code=202)
async def generate_report(body: GenerateReportRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_report_generation, job_id=job_id, params=body)
    return ApiResponse(success=True, data={"job_id": job_id, "status": "queued"})
```

### 22.15 API Versioning

All routes must be prefixed with `/api/v1/`. Introducing a breaking change requires a new `/api/v2/` prefix — old versions must continue to work for a minimum of 3 months after deprecation notice.

```python
# app/api/v1/router.py
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
```

### 22.16 Health Checks

Two health endpoints are required and must be unauthenticated:

```python
@app.get("/health")
async def health():
    """Basic liveness check — returns 200 if the process is running."""
    return {"status": "ok"}

@app.get("/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """Readiness check — verifies DB and critical dependencies are reachable."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "db": "ok"}
    except Exception as e:
        logger.error("Readiness check failed", extra={"error": str(e)})
        return JSONResponse(status_code=503, content={"status": "unavailable", "db": "error"})
```

### 22.17 OpenAPI Documentation

FastAPI generates OpenAPI automatically. The following rules apply:

- Every endpoint must have a `summary` and `description`.
- All response models must be declared (`response_model=`) for accurate schema generation.
- The `/docs` and `/redoc` endpoints must be **disabled in production** (`docs_url=None` in the app factory).
- A separate, authenticated internal docs deployment is acceptable for team use.

### 22.18 Security

| Rule | Enforcement |
|---|---|
| No hardcoded secrets | `ruff` secret detection + CI gate |
| Parameterised SQL only | Code review gate |
| HTTPS enforced | Infra / load balancer level — backend redirects HTTP to HTTPS |
| `X-Content-Type-Options: nosniff` | Security middleware |
| `X-Frame-Options: DENY` | Security middleware |
| `Strict-Transport-Security` | Infra / load balancer |
| Dependency vulnerability scan | `pip-audit` or `safety` — CI gate, no high/critical |
| OWASP Top 10 | Reviewed at design phase for any new data-handling endpoint |

### 22.19 Testing

| Type | Tool | Minimum coverage |
|---|---|---|
| Unit | pytest + pytest-asyncio | 80% for `services/` and `utils/` |
| Integration | pytest + `httpx.AsyncClient` against real test DB | All endpoints — happy path + all error paths |
| Contract | Response schema validated against Pydantic models | All endpoints |

**What must be tested:**
- All endpoints: 2xx success, 4xx client errors, 5xx error paths
- All Pydantic models: valid input, invalid input, edge cases
- All exception handlers: confirm correct status code and envelope shape
- Auth middleware: valid token, expired token, missing token, wrong role
- Rate limiter: confirm 429 is returned when limit is exceeded
- External integrations: mocked with `respx` or `pytest-httpx` — no real API calls in tests

Test database isolation: each test must run in its own transaction, rolled back after the test. Never share state between tests.

### 22.20 Deployment & Containerisation

```dockerfile
# Required base image pattern
FROM python:3.12-slim AS base
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && poetry install --no-root --no-dev
COPY . .
CMD ["gunicorn", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000"]
```

| Concern | Spec |
|---|---|
| Azure deployment target | Azure Container Apps (preferred) or App Service |
| Worker count | `(2 × CPU cores) + 1` — configurable via env `WEB_CONCURRENCY` |
| Graceful shutdown | Handle `SIGTERM` — drain in-flight requests before exit (30s timeout) |
| Container registry | Azure Container Registry |
| Image scanning | Trivy or equivalent — no high/critical CVEs before deploy |

### 22.21 Performance Targets

| Metric | Target |
|---|---|
| p95 latency — read endpoints | < 200ms (excluding DB cold start) |
| p95 latency — write endpoints | < 500ms |
| p95 latency — integration endpoints | < 3 000ms |
| DB query timeout | 30 seconds |
| External API call timeout | 10 seconds |
| Max request body size | 10MB (configurable per endpoint) |
| Startup time | < 10 seconds to first healthy `/ready` response |


---

## 23. Database Schema Design (Non-Negotiable)

### 23.1 Normalisation — Third Normal Form (3NF)

All database schemas must conform to **Third Normal Form**. Schemas that violate 3NF will be rejected in review.

| 3NF Rule | What it means in practice |
|---|---|
| 1NF — Atomic values | No comma-separated lists in a column. No repeating column groups (e.g. `tag_1`, `tag_2`, `tag_3`). Use a junction table. |
| 2NF — No partial dependencies | Every non-key column must depend on the whole primary key, not just part of it. No composite PKs where some columns depend on only one part. |
| 3NF — No transitive dependencies | Non-key columns must depend on the PK directly, not through another non-key column. If `city` determines `country`, `country` belongs in a separate table. |

**Prohibited patterns:**

- No redundant tables that duplicate data from another table.
- No duplicate columns storing the same data in multiple tables without a FK relationship.
- No unnecessary JSON/JSONB blobs for structured data that should be columns (exception: genuinely schemaless config or extension data — requires engineering lead approval).
- No denormalised copies of data for "performance" without a documented measurement proving the normalised version is too slow.
- Only create tables required by the specification. No speculative tables for "future features."

**When JSON/JSONB is acceptable:**

| Acceptable | Not acceptable |
|---|---|
| User preferences object with arbitrary keys | Storing a list of tags that could be a junction table |
| Extension metadata from a third-party webhook | Storing name + email when a `users` table already has them |
| AI model output that is inherently schemaless | Storing address fields that will be queried individually |

### 23.2 Constraints (Required on All Tables)

Every table must enforce data integrity at the database level — not just at the application level.

```sql
-- Required constraint patterns
CREATE TABLE tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL CHECK (char_length(title) > 0),
    status      VARCHAR(50) NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
    assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    due_date    DATE CHECK (due_date >= CURRENT_DATE),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every FK must have an index
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

-- Composite index for common filter patterns
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
```

| Constraint type | When required |
|---|---|
| `NOT NULL` | All columns that are logically required — no nullable columns "just in case" |
| `CHECK` | Status/type enum columns, length validations, business rules expressible in SQL |
| `FOREIGN KEY` | All relationships — `ON DELETE` action must be explicitly chosen |
| `UNIQUE` | All columns or column combinations that must be unique (email, slug, etc.) |
| `DEFAULT` | `created_at`, `updated_at`, UUID PKs |

**`ON DELETE` rules:**

| Action | When to use |
|---|---|
| `CASCADE` | Child records have no meaning without the parent (e.g. task comments) |
| `RESTRICT` | Parent must not be deleted while children exist (e.g. user with open tasks) |
| `SET NULL` | FK is optional and the child record still makes sense without the parent |

Never use `ON DELETE NO ACTION` — it is the same as `RESTRICT` but deferred, which is confusing.

### 23.3 Schema Documentation (Required)

Every table must have a comment block in the migration file explaining:

```sql
-- TABLE: tasks
-- Purpose: Stores individual work items assigned to users within a project.
-- Relationships:
--   - belongs to projects (project_id FK)
--   - belongs to users as assignee (assignee_id FK)
--   - has many task_comments (tasks.id referenced by task_comments.task_id)
-- Notes: Soft-deleted via deleted_at. Hard delete is not used.

COMMENT ON TABLE tasks IS 'Individual work items assigned to users within a project.';
COMMENT ON COLUMN tasks.status IS 'Lifecycle state: todo -> in_progress -> done. Enforced by CHECK constraint.';
COMMENT ON COLUMN tasks.assignee_id IS 'The user currently responsible for this task. Cannot be null — tasks must always have an owner.';
```

**Deliverables for every schema change:**

- [ ] Migration file with SQL comments on table and all non-obvious columns
- [ ] Updated ER diagram (Mermaid `erDiagram` in `docs/schema.md`)
- [ ] Updated `docs/schema.md` with table purpose, column rationale, and relationship descriptions

---

## 24. Security — Authorization System (Non-Negotiable)

### 24.1 Default: All Routes Are Protected

Every route is authenticated and authorized by default. A route is only public if it is **explicitly and intentionally declared public**. This is non-negotiable — no route may be accidentally public.

```python
# app/api/dependencies.py

# Standard: inject on all protected routes
async def require_auth(current_user: User = Depends(get_current_user)) -> User:
    return current_user

# Explicit opt-out for public routes — must be used intentionally
# Usage: @router.post("/auth/login", dependencies=[])  with no auth dependency
```

**Public routes must be documented in `docs/public-routes.md` with justification for why each is public.**

### 24.2 Role-Based Authorization

```python
from enum import StrEnum

class UserRole(StrEnum):
    ADMIN   = "admin"
    MEMBER  = "member"
    VIEWER  = "viewer"

# Role dependency factory
def require_role(*roles: UserRole):
    async def check_role(current_user: User = Depends(require_auth)) -> User:
        if current_user.role not in roles:
            raise AppException(status_code=403, message="Insufficient permissions", code="FORBIDDEN")
        return current_user
    return check_role

# Usage on endpoints
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    ...
```

| Role | Default access |
|---|---|
| `admin` | All routes |
| `member` | Read + write own resources |
| `viewer` | Read only |

- Role is encoded in the JWT claims and validated on every request — never read from the database on every request (performance).
- Resource-level authorization (can this user access *this specific record*) must be enforced in the service layer, not just by role check.

### 24.3 Input Sanitisation

- All string inputs must be stripped of leading/trailing whitespace before persistence (Pydantic `model_config = ConfigDict(str_strip_whitespace=True)`).
- Any user-generated content rendered in the frontend must be treated as untrusted — the frontend must sanitise before rendering.
- File upload endpoints must validate MIME type, extension, and maximum size. No execution of uploaded files.

---

## 25. Code Quality & Folder Structure (Non-Negotiable)

### 25.1 Backend Folder Structure

```
backend/
├── app/
│   ├── api/                  # Route handlers only — no business logic
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── tasks.py
│   │   │   └── router.py
│   │   └── dependencies.py   # Shared FastAPI dependencies (auth, db, pagination)
│   ├── services/             # Business logic — called by API layer
│   │   ├── task_service.py
│   │   └── auth_service.py
│   ├── integrations/         # Third-party API clients
│   │   ├── slack.py
│   │   ├── openai.py
│   │   └── base.py           # Base integration class with retry/timeout
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── base.py
│   │   ├── user.py
│   │   └── task.py
│   ├── schemas/              # Pydantic request/response models
│   │   ├── task.py
│   │   └── common.py         # ApiResponse, PaginatedResponse, etc.
│   ├── utils/                # Stateless utility functions
│   │   ├── security.py
│   │   └── pagination.py
│   ├── middleware/            # ASGI middleware (request ID, logging, etc.)
│   ├── config.py             # pydantic-settings Settings class
│   └── main.py               # FastAPI app factory
├── migrations/               # Alembic migration files
│   └── versions/
├── tests/
│   ├── api/                  # Endpoint integration tests
│   ├── services/             # Unit tests for service layer
│   └── conftest.py
├── docs/
│   ├── schema.md             # ER diagram + table documentation
│   └── public-routes.md      # All intentionally public routes
├── pyproject.toml
├── poetry.lock
├── Dockerfile
└── .env.example
```

**Layer rules:**

- `api/` handlers must only: validate input (via Pydantic, automatic), call a service, and return the response. No business logic, no DB queries, no integration calls directly from a handler.
- `services/` contains all business logic. Services may call other services, models, and integrations.
- `integrations/` contains only the HTTP client wrappers for external APIs. No business logic.
- `models/` contains only SQLAlchemy ORM definitions. No methods that contain business logic.
- Circular imports between layers are prohibited.

### 25.2 Frontend Folder Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── (auth)/               # Route group — auth pages (login, register)
│   ├── (dashboard)/          # Route group — protected pages
│   └── layout.tsx
├── components/
│   ├── ui/                   # Atoms — Button, Input, Badge, Spinner
│   ├── shared/               # Molecules — SearchBar, FormField, AlertToast
│   ├── features/             # Organisms — Sidebar, DataTable, Notifications
│   └── layouts/              # AppShell, PageWrapper
├── hooks/                    # Custom React hooks (all prefixed with `use`)
├── lib/
│   ├── api/                  # apiClient + per-resource query hooks
│   ├── config.ts             # Env var validation
│   └── logger.ts             # Logging adapter
├── stores/                   # Zustand stores
├── types/                    # Shared TypeScript types and Zod schemas
├── utils/                    # Pure utility functions
└── public/
```

### 25.3 Naming Conventions

**Python (backend):**

| Context | Convention | Example |
|---|---|---|
| Files and modules | `snake_case` | `task_service.py` |
| Classes | `PascalCase` | `TaskService`, `CreateTaskRequest` |
| Functions and variables | `snake_case` | `get_current_user`, `task_id` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_PAGE_SIZE = 100` |
| Pydantic models (request) | `<Noun>Request` | `CreateTaskRequest` |
| Pydantic models (response) | `<Noun>Response` | `TaskResponse` |
| SQLAlchemy models | `<Noun>` (singular) | `Task`, `User`, `Project` |
| Database tables | `snake_case` (plural) | `tasks`, `users`, `project_members` |
| Exception classes | `<Noun>Error` or `<Noun>Exception` | `SlackTokenExpiredError` |

**TypeScript (frontend):**

| Context | Convention | Example |
|---|---|---|
| Files (components) | `PascalCase.tsx` | `TaskCard.tsx` |
| Files (hooks, utils) | `camelCase.ts` | `useTaskList.ts` |
| React components | `PascalCase` | `TaskCard`, `AppShell` |
| Hooks | `use<Noun>` | `useTaskList`, `useAuth` |
| Types and interfaces | `PascalCase` | `Task`, `ApiResponse<T>` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_TOAST_COUNT` |
| Variables and functions | `camelCase` | `fetchTasks`, `currentUser` |
| Zod schemas | `<noun>Schema` | `taskSchema`, `createTaskSchema` |
| CSS class names | Tailwind utilities only — no custom class names in components |

**Universal naming rules (both backend and frontend):**

- Names must be clear and descriptive — a new engineer must understand the purpose without reading the implementation.
- No abbreviations unless they are universally standard (`id`, `url`, `api`, `db`, `http`, `uuid`).
- No magic numbers — all numeric constants must be named (`MAX_RETRY_COUNT = 3`, not `range(3)`).
- No single-letter variable names outside of loop indices (`i`, `j`) and lambda arguments.
- Boolean variables and functions must use an `is_`, `has_`, `can_`, or `should_` prefix (`is_active`, `has_permission`, `can_edit`).

---

## 26. Coding Agent Behavior Rules (Non-Negotiable — Critical)

These rules govern how AI coding agents and developers operating in an agent-assisted mode must behave. Violations result in the output being rejected and restarted.

### 26.1 NEVER — Absolutely Prohibited

An agent must never do any of the following, regardless of instructions or apparent convenience:

| Prohibited action | Why |
|---|---|
| Invent features not in the specification | Scope creep — adds untested surface area and breaks the product contract |
| Modify the architecture without an approved RFC | Architecture changes break assumptions across the entire codebase |
| Add tables not required by the specification | Violates 3NF rule "only create tables required by the specification" |
| Create placeholder / stub logic (`pass`, `TODO`, `raise NotImplementedError`) | Placeholder code ships to production and breaks silently |
| Skip UI polish or use placeholder styling | The UI/UX requirements (Section 3) are non-negotiable — incomplete UI is a bug |
| Leave incomplete implementations | Every deliverable must be fully functional — see Section 26.3 |
| Assume future work will complete a feature | If it is not done now, it does not exist |
| Ignore error handling | Every error path must be handled, logged, and surfaced correctly |
| Return `200` for failures | See Section 22.4 |
| Use synchronous blocking code in async endpoints | See Section 22.1 |
| Hardcode secrets, URLs, or environment-specific values | See Section 22.11 and Section 6 |
| Create a route without auth unless explicitly declared public | See Section 24.1 |
| Add an N+1 query | See Section 22.12 |
| Use `any` type in TypeScript | See Section 1.1 |
| Use inline CSS or hardcoded hex colors in components | See Section 14.1 |
| Skip loading, empty, or error states in a component | See Section 3.4 |

### 26.2 MUST ALWAYS — Non-Negotiable Obligations

An agent must always do the following in every piece of code it produces:

**Code quality:**
- Produce production-ready code — no debug statements, no commented-out code, no `print()` or `console.log()` left in final output.
- Follow all naming conventions in Section 25.3.
- Use typed interfaces and models throughout — no untyped structures.
- Follow the folder structure in Section 25.1 (backend) and Section 25.2 (frontend).

**Error handling:**
- Handle every error path explicitly — network failure, validation failure, auth failure, not found, server error.
- Use the structured response envelope (Section 22.3) for all backend responses.
- Map all errors to typed `AppException` subclasses on the backend.
- Surface errors to the user via the notification system (Section 3.6) on the frontend.
- Log every error with the required fields (Section 22.7 and Section 10).

**Database:**
- Follow 3NF (Section 23.1) — reviewers will reject schemas that violate normalisation.
- Add constraints, indexes, and documentation for every new table (Section 23.2 and 23.3).
- Use eager loading to prevent N+1 queries (Section 22.12).
- Write Alembic migration files for every schema change.

**Security:**
- Apply auth dependency to every new endpoint unless explicitly told to make it public.
- Verify webhook signatures before processing (Section 22.13).
- Never log PII or secrets (Section 22.7 and Section 10.3).
- Validate all inputs with Pydantic (Section 22.2).

**UI/UX:**
- Implement all four component states: loading, empty, error, success (Section 3.4).
- Apply Glassmorphism design tokens — no raw hex values (Section 3.1 and Section 14).
- Ensure the component works in both light and dark mode (Section 3.3).
- Make every new component responsive across mobile, tablet, and desktop (Section 3.2).

**Testing:**
- Write tests for every new endpoint — happy path and all error paths (Section 22.19).
- Write component tests for every new shared component (Section 17).

### 26.3 Implementation Standard

**Partial implementations are not allowed.** Every deliverable must meet all of the following criteria before it is considered complete:

| Criterion | Definition |
|---|---|
| Fully functional | The feature works end-to-end without any placeholder, stub, or mock that is not a test fixture |
| Error-handled | Every failure path returns a correct structured response or renders a correct UI error state |
| Logged | All significant events and errors are logged with the required fields |
| Typed | No `any`, no untyped `dict`, no missing Pydantic models |
| Tested | Unit and integration tests exist and pass |
| Documented | New endpoints appear in OpenAPI, new tables have migration comments |
| Styled | UI components match the Glassmorphism design system in both light and dark mode |
| Responsive | UI components work correctly at mobile, tablet, and desktop breakpoints |
| Secure | Auth applied, inputs validated, secrets not hardcoded, PII not logged |

If any criterion is not met, the implementation is incomplete and must not be merged.

**There is no "Phase 2" for production-readiness.** Code that works but is not logged, not tested, not typed, or not styled is not production-ready and is not mergeable.

