# Frontend Foundation Implementation Plan (Phase 3)

## Status

Implemented.

Phase 3 foundation outcomes are now in place:

- typed TanStack Router app shell
- auth-aware public/protected route structure
- shared API/query foundation
- reusable `DataTable`
- SCSS token/base foundation
- frontend tests for routing, auth shell, API behavior, and shared primitives

Related completed follow-on work:

- Phase 4 scrape/data views are implemented and documented in `SCRAPE_VIEWS_IMPLEMENTATION.md`
- product-history enhancements are implemented and documented in `FURTHER_IMPLEMENTATIONS.md`
- Phase 4 styling cleanup is implemented and documented in `STYLING_ARCHITECTURE_IMPLEMENTATION.md`

## 1. Scope

This plan covers **all Phase 3 roadmap items** from `REQUIREMENTS.md`:

- Scaffold/confirm React + Vite + TypeScript frontend baseline
- Set up TanStack Router route tree
- Implement public routes: landing, login, register
- Implement protected app layout for authenticated users
- Implement frontend data-flow foundation (`FRONTEND_DATA_FLOW.md`)
- Add shared table primitives using TanStack Table for dashboard lists
- Add Sass support and global style entrypoint for token/base layers
- Write frontend tests for route guards and auth shell behavior

Out of scope:

- Feature-rich dashboard data views (Phase 4)
- Full settings workflows (Phase 5)
- Payments (Phase 6)

## 2. Goals

1. Replace Vite starter frontend with a maintainable app shell.
2. Establish typed routing and auth boundaries early.
3. Build one reusable data-access foundation used by all future views.
4. Lock in CSS architecture (CSS Modules + SCSS tokens/layers).
5. Add enough tests to prevent routing/auth regressions.

## 3. Technical Decisions

- Router: `@tanstack/react-router`
- Data: `@tanstack/react-query`
- Tables: `@tanstack/react-table`
- Forms: `react-hook-form` + `zod` (for login/register)
- Styling: `*.module.scss` + global SCSS foundation
- Tests: `vitest` + `@testing-library/react` + `@testing-library/jest-dom`

## 4. Deliverables By Workstream

## 4.1 App Baseline

Deliver:

- frontend dependencies updated for Phase 3 stack
- clean app bootstrap replacing starter `App.tsx`/`App.css`
- environment-aware API base URL usage (Vite env vars)

Target file structure (minimum):

- `frontend/src/main.tsx`
- `frontend/src/app/`
- `frontend/src/routes/`
- `frontend/src/features/`
- `frontend/src/lib/api/`
- `frontend/src/lib/query/`
- `frontend/src/styles/`

## 4.2 Routing (TanStack Router)

Deliver route tree with:

- public routes:
  - `/` (landing)
  - `/login`
  - `/register`
- protected layout route:
  - `/app` (shell + nav + outlet)

Guard behavior:

- if user is unauthenticated and route is protected -> redirect to `/login`
- if user is authenticated and visits `/login` or `/register` -> redirect to `/app`

Route modules should be file-based or code-based consistently (pick one; recommendation: code-based now for simplicity).

## 4.3 Protected App Shell

Deliver base authenticated layout:

- top-level app frame (header + content container)
- placeholder nav links for upcoming Phase 4 views:
  - Home
  - Runs
  - Settings
- auth-aware user badge/logout action placeholder

No heavy feature UI yet; shell first.

## 4.4 Data Flow Foundation (from `FRONTEND_DATA_FLOW.md`)

Deliver:

- shared API client wrapper
- standardized API error normalization
- query key factory module
- query client defaults (`staleTime`, retries, dev-friendly defaults)
- auth session query (`me`) and bootstrap logic
- mutation invalidation conventions documented in code comments/README snippet

Minimum API modules:

- `lib/api/client.ts`
- `lib/api/errors.ts`
- `lib/api/schemas.ts`
- `lib/query/query-client.ts`
- `lib/query/query-keys.ts`
- `features/auth/queries.ts`
- `features/auth/mutations.ts`

Auth behavior:

- requests include credentials
- 401 handling policy:
  - auto-refresh retry for idempotent `GET` requests only
  - do not auto-retry non-idempotent mutations by default
  - exclude auth endpoints from refresh interception
  - single-flight refresh lock to prevent concurrent refresh storms
  - redirect to login if refresh/retry fails
- CSRF assumption: same-site deployment with `sameSite=strict` cookies; if frontend/backend become cross-site later, add explicit CSRF protection before rollout
- add runtime response validation for critical payloads (`/api/auth/me`, runs list/detail)

## 4.5 Shared Table Primitive (TanStack Table)

Deliver one reusable table foundation for future use:

- generic `<DataTable />` wrapper
- typed column helpers
- standardized empty/loading state slots

Keep scope narrow:

- no feature-specific runs columns yet
- prove primitive works with mock data

## 4.6 SCSS Foundation

Deliver SCSS architecture aligned with requirements:

- `styles/abstracts/_variables.scss`
- `styles/abstracts/_mixins.scss`
- `styles/abstracts/_functions.scss`
- `styles/base/_reset.scss`
- `styles/base/_typography.scss`
- `styles/components/_buttons.scss`
- `styles/components/_cards.scss`
- `styles/layout/_app-shell.scss`
- `styles/main.scss` entrypoint imported once in app bootstrap

Rules:

- component styles in `*.module.scss`
- all components consume CSS custom-property tokens
- dark mode token overrides in `@media (prefers-color-scheme: dark)`

## 4.7 Frontend Tests

Deliver foundational test coverage:

- route guard tests (protected route redirect behavior)
- auth shell rendering tests (with authenticated mock state)
- login/register route rendering tests
- one test for reusable table primitive rendering
- API client tests for 401 refresh lock + retry policy (GET only)
- API schema validation tests for critical endpoints
- accessibility tests for auth and shell routes (labels, focus, keyboard navigation)

Testing setup deliverables:

- Vitest config for frontend
- RTL setup file
- test utilities for rendering with router/query providers

## 5. Suggested Implementation Order

1. Install frontend dependencies and clean starter app files.
2. Add TanStack Router route tree and providers.
3. Implement public routes and protected layout guard.
4. Implement API client + query client + query keys + auth session query.
5. Wire auth-aware routing behavior (`/login` vs `/app`).
6. Add SCSS foundation and migrate shell/page styles to CSS Modules.
7. Add shared table primitive.
8. Add frontend tests for guards + shell + table primitive.
9. Validate build, lint, and test commands.

## 6. Acceptance Criteria

Phase 3 is complete when:

- router and route guards are active and typed
- public and protected shells are navigable
- auth session bootstrap works via backend cookies
- shared API/query foundation is in place and used by routes
- refresh/retry policy follows idempotency and single-flight rules
- SCSS foundation exists and tokens are used by module styles
- reusable table primitive exists for Phase 4 views
- frontend tests cover guard and shell behavior
- baseline accessibility checks pass for auth/shell screens
- `npm run build --workspace=frontend` and frontend test command pass

## 7. Risks and Mitigations

Risk: routing + auth redirects become brittle.

- Mitigation: test guards explicitly and keep one source of auth truth (`me` query).

Risk: duplicated fetch logic appears before Phase 4 starts.

- Mitigation: block direct `fetch` in feature components; use shared client/query modules.

Risk: CSS tokens exist but components still hardcode values.

- Mitigation: enforce module style review rule: spacing/color/typography from tokens only.

Risk: table primitive over-scoped too early.

- Mitigation: keep primitive minimal and headless; add advanced features in Phase 4.

## 8. Follow-up to Phase 4

The Phase 4 follow-up described above has now been completed:

- dashboard home uses real prefetched data
- runs list uses URL-backed sort/pagination/filter state
- run detail and product history routes use typed params and query preloading
