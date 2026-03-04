# Frontend Data Flow

## 1. Purpose

Define how frontend routes load and mutate backend data in a consistent, typed, and testable way.

This document aligns with:

- TanStack Router for route orchestration
- TanStack Query for server-state management
- cookie-based auth from backend (`HttpOnly` access/refresh cookies)

## 2. Scope

Covers Phase 4 dashboard data flows for:

- dashboard home summary
- scrape runs list
- scrape run detail
- product detail and price history
- notification channel and settings views (shared patterns)

## 3. Data Flow Principles

- use a single API client wrapper, not scattered `fetch` calls
- all authenticated requests use `credentials: "include"`
- route loaders use Query Client (`ensureQueryData`) for prefetching
- components consume cached query hooks; they do not own transport logic
- all mutations declare explicit query invalidation targets
- query keys are centralized and deterministic

## 4. Frontend Data Layer Structure

Suggested file structure:

- `frontend/src/lib/api/client.ts`
- `frontend/src/lib/api/errors.ts`
- `frontend/src/lib/api/endpoints.ts`
- `frontend/src/lib/query/query-client.ts`
- `frontend/src/lib/query/query-keys.ts`
- `frontend/src/features/<feature>/queries.ts`
- `frontend/src/features/<feature>/mutations.ts`

Responsibilities:

- `client.ts`: base request utility (`baseUrl`, credentials, JSON parse)
- `errors.ts`: normalize backend error payloads (`error`, `message`, status)
- `schemas.ts`: runtime validation for critical response payloads
- `endpoints.ts`: typed endpoint helpers
- `query-keys.ts`: canonical cache key factory
- `queries.ts` / `mutations.ts`: feature-level query and mutation hooks

## 5. Transport Contract

- protocol: REST JSON
- auth transport: cookies only (`credentials: include`)
- default request headers:
  - `Content-Type: application/json`
  - `Accept: application/json`
- default behavior on `401`:
  - apply auto-refresh retry only for idempotent `GET` requests by default
  - never auto-retry non-idempotent mutations unless explicitly marked safe
  - exclude auth endpoints (`/api/auth/refresh`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`) from refresh interception
  - use a single-flight refresh lock to avoid concurrent refresh storms
  - if still unauthorized, redirect to login route

## 5.1 CSRF Assumptions

- current model assumes same-site frontend/backend deployment with cookie `sameSite=strict`
- if deployment changes to cross-site, add explicit CSRF protection before enabling that topology

## 6. Query Key Strategy

Use stable key factories:

- `auth.me()`
- `runs.list(params)`
- `runs.detail(runId)`
- `runs.products(runId, params)`
- `runs.changes(runId)`
- `products.detail(productId)`
- `products.history(productId, params)`
- `notifications.channels()`

Rules:

- include filter/sort/pagination params in keys
- never build ad-hoc string keys inside components

## 7. Route-to-Data Mapping

### Dashboard Home

- load latest runs summary and recent change counts
- prefetch on dashboard route entry (avoid global prefetch for unrelated routes)

### Scrape Runs List

- source: `GET /api/runs`
- supports table pagination, sorting, filtering
- table state maps to query params and URL search params

### Scrape Run Detail

- source: `GET /api/runs/:id`
- companion data:
  - `GET /api/runs/:id/products`
  - `GET /api/runs/:id/changes`

### Product Detail / History

- source: `GET /api/products/:id`
- history source: `GET /api/products/:id/history`

### Settings / Notification Channels

- source: `GET /api/notifications/channels`
- mutations:
  - `POST /api/notifications/channels`
  - `PATCH /api/notifications/channels/:id`
  - `DELETE /api/notifications/channels/:id`

## 8. Mutation and Invalidation Rules

- channel create/update/delete invalidates:
  - `notifications.channels()`
- manual scrape trigger invalidates (future endpoint wiring):
  - `runs.list(...)`
  - `dashboard.home(...)`
- auth logout clears query cache and routes to login

## 9. Table Data Pattern (TanStack Table)

For table-heavy views (runs/products/channels):

- keep server-side pagination/filter/sort in URL + query params
- feed API response rows into TanStack Table
- table UI state (page, sort, filters) drives query keys
- avoid client-side resorting of already server-sorted pages

## 10. Error and Loading UX Rules

- global API error boundary for unexpected failures
- inline empty/loading/error states per view
- preserve previous page data during pagination transitions where useful
- show mutation toasts for create/update/delete actions

## 11. Testing Strategy

- unit test query key factories
- unit test API client error normalization
- integration test route loader + query prefetch for each protected view
- component tests for table views with mocked query data
- mutation tests verifying invalidation and optimistic UI (if applied)

## 12. Phase Placement

Implement this foundation in **Phase 3**, then apply it to feature views at the start of Phase 4.

Recommended sequence:

1. finalize API client + query keys + query client defaults
2. add runtime response validation for critical endpoints (`/api/auth/me`, runs list/detail)
3. wire route loaders and protected-route data prefetch
4. build dashboard home and runs list on top of that foundation

This avoids duplicated fetch logic and prevents rework across all dashboard views.

## 13. Frontend State Management

The frontend state model is intentionally split by responsibility.

### 13.1 Server state

- Owner: TanStack Query
- Examples: current user (`/api/auth/me`), runs list/detail, product detail/history, channels, subscriptions
- Rules:
  - fetched via shared API client
  - keyed with centralized query-key factory
  - invalidated by mutations
  - prefetched with route loaders where appropriate

### 13.2 Route and URL state

- Owner: TanStack Router
- Examples: route params (`runId`, `productId`), search params for pagination/sorting/filtering
- Rules:
  - URL is source of truth for navigable table/filter state
  - route loaders use `ensureQueryData` for deterministic data preloading

### 13.3 Auth session state

- Owner: cookie-backed backend session + Query cache
- Rules:
  - access/refresh tokens remain in `HttpOnly` cookies
  - frontend derives session from `/api/auth/me`
  - on `401`: refresh once, retry once, then redirect to login if still unauthorized

### 13.4 Form state

- Owner: React Hook Form + Zod
- Examples: login/register, settings, notification channel create/update forms
- Rules:
  - form state stays local to feature/components
  - successful mutations trigger query invalidation

### 13.5 UI-only local state

- Owner: local component state (or small feature contexts)
- Examples: modal open state, active tab, transient selection, toast visibility
- Rule: do not store UI-only state in Query unless it represents server state

### 13.6 Table interaction state

- Owner: TanStack Table + Router search params
- Examples: current page, sort order, column filters/visibility
- Rules:
  - table state drives query params
  - backend remains source of truth for paginated/sorted data

### 13.7 Global client store policy

A dedicated global store (Redux/Zustand) is not required initially.

Add one only if significant cross-feature client-only state emerges that is not well served by Router + Query + local state.
