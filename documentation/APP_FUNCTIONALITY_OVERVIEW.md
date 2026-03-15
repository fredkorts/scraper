# PricePulse App Functionality Overview

## Status

Drafted on March 15, 2026 for product and engineering review.

## 1. What PricePulse Is

PricePulse is a full-stack product intelligence and price tracking platform for `mabrik.ee`.

At a high level, the app:

1. Tracks selected product categories on a schedule.
2. Scrapes product data and stores canonical product state.
3. Detects meaningful changes between runs (price up/down, new item, sold out, back in stock).
4. Surfaces those changes in dashboard, runs, changes explorer, and product detail views.
5. Sends notifications based on user role and channel configuration.

## 2. System Components

1. Frontend (`frontend`)

- React + Vite + TanStack Router + TanStack Query + Ant Design.
- Authenticated dashboard UI for runs, changes, products, and settings.

2. Backend (`backend`)

- Express API + Prisma/PostgreSQL + Redis-backed queue/worker.
- Owns auth, category catalog, scrape orchestration, diff engine, and notifications.

3. Shared package (`shared`)

- Shared contracts (types, enums, constants) used by both frontend and backend.

## 3. Core Domain Objects

1. `Category`

- Trackable unit with hierarchy support (`parentId`), schedule (`scrapeIntervalHours`), and runtime cursor (`nextRunAt`).

2. `UserSubscription`

- User-to-category tracking relationship (`isActive`), used for scope and scheduling eligibility.

3. `UserTrackedProduct`

- User watchlist entry for specific products (`isActive`, deactivation reason).

4. `ScrapeRun`

- Execution record for one category scrape attempt with status, counters, duration, and structured failure metadata.

5. `Product`

- Canonical product record keyed by `externalUrl`.

6. `ProductSnapshot`

- Historical state points written per run only when tracked state changes (or for newly discovered products).

7. `ChangeReport` and `ChangeItem`

- Diff output per run and per product change event.

8. `NotificationChannel` and `NotificationDelivery`

- Per-user delivery targets and delivery lifecycle state.

## 4. Backend Architecture (Thorough)

## 4.1 Request and Security Pipeline

The backend app shell (`backend/src/app.ts`) applies:

1. Trusted CORS with credentialed cookies.
2. Helmet security headers.
3. Cookie parsing and JSON body parsing.
4. Request-scoped logging context.
5. Global and route-scoped rate limiting.
6. Optional auth hydration middleware.
7. Route-level auth, CSRF, and trusted-origin checks.

Error handling is centralized:

1. Zod validation errors return `400`.
2. Known `AppError` values return explicit status + code.
3. Unknown failures return `500`.

## 4.2 Authentication and Session Model

Auth supports:

1. Email/password registration and login.
2. Refresh-token rotation with revocation.
3. CSRF-protected mutation endpoints.
4. Email verification and password reset.
5. MFA setup/verify/disable with recovery codes.
6. Session listing and revocation.
7. Google OAuth (feature-flagged).

Security controls include:

1. HttpOnly auth cookies.
2. CSRF token cookie + header matching.
3. Trusted-origin enforcement on sensitive mutations.
4. OAuth challenge cookie signing + PKCE + nonce/state verification.
5. Account-state restrictions (inactive/admin/MFA policy checks).

## 4.3 Category Catalog and Hierarchy

Category data originates from two paths:

1. Seed baseline (`backend/prisma/seed.ts` using shared `MABRIK_CATEGORIES`).
2. Refresh command (`npm run categories:refresh --workspace=backend`) that discovers category structure from live site HTML and can apply changes with `--apply`.

Refresh behavior:

1. Parses category list candidates from root HTML.
2. Normalizes slugs under `/tootekategooria/`.
3. Upserts categories by slug.
4. Rebuilds parent-child links (`parentId`).
5. Reactivates or deactivates categories based on discovery.
6. Protects against mass accidental deactivation via max ratio guard.

Hierarchy helpers compute:

1. `depth`
2. `pathNameEt` / `pathNameEn`
3. ordered tree traversal for UI selectors
4. descendant category scope expansion for filters

## 4.4 How Categories Get Tracked (Deep Dive)

Category tracking is the heart of the product.

### Tracking entry points

1. User creates category subscription (`POST /api/subscriptions`).
2. User removes subscription (`DELETE /api/subscriptions/:id`).
3. Admin can change category interval (`PATCH /api/categories/:id/settings`).
4. Admin can manually trigger category run (`POST /api/runs/trigger`).

### Access scope model

1. Admin role has unrestricted category access.
2. Non-admin users are scoped to active subscribed categories only.
3. This scope is reused consistently across dashboard, runs, changes, product detail/history, and search.

### Capacity model

Tracking capacity is shared between category subscriptions and watched products:

1. Free: 3 total slots.
2. Paid: 6 total slots.
3. Admin: unlimited.

When a subscription is removed:

1. The subscription is deactivated.
2. Any watched products that are no longer reachable through remaining active subscribed categories are auto-deactivated with reason `category_untracked`.

### Scheduler eligibility

A category is due for scheduler enqueue when all are true:

1. Category is active.
2. `nextRunAt` is null or `<= now`.
3. At least one active subscription exists from an active user.

Due categories are enqueued with deterministic job IDs (`scrape:category:<categoryId>`) to avoid duplicate active jobs.

### Worker and execution lifecycle

Worker behavior for each job:

1. Load category schedule state.
2. Skip if category inactive or has no active subscribers (except manual trigger path).
3. Execute scrape.
4. Update `nextRunAt = now + scrapeIntervalHours` after completion.
5. On failure, apply retry logic and retry-budget enforcement.
6. Advance `nextRunAt` even after exhausted/retry terminal failure to avoid permanent stall.

### Scrape run internals

Per category run:

1. Acquire distributed category lock (Redis-based lock backend).
2. Create `ScrapeRun` in `RUNNING`.
3. Respect robots policy.
4. Crawl paginated category pages.
5. Parse products.
6. Persist canonical products + snapshots.
7. Mark run complete or failed with structured failure metadata.
8. Release lock in `finally`.

### Persistence semantics

1. Products are canonical by `externalUrl`.
2. Product-category links are upserted.
3. Product snapshots are state-based (written on new product or tracked state change).
4. Missing links for category are recorded in stats for reconciliation/reporting.

### Diff + notification coupling

After scrape (unless `skipDiff` or system-noise run):

1. Build baseline from current run and historical records.
2. Detect change events.
3. Persist one `ChangeReport` per run.
4. Persist `ChangeItem` rows.
5. Create `PENDING` `NotificationDelivery` rows for recipients in that category.
6. Trigger immediate notification sender for paid/admin.
7. Free-user pending deliveries are consumed by digest sender.

### Why this model is robust

1. Scheduling is subscriber-aware (no wasted scraping).
2. Runtime access scope and scheduler scope are aligned.
3. Category hierarchy is first-class for filtering and admin visibility.
4. Queue deduping + lock + retry budgets reduce duplicate and runaway work.
5. Canonical product model avoids category-local identity fragmentation.

## 4.5 Data Read APIs and What They Return

1. Dashboard (`/api/dashboard/home`)

- latest runs, recent failures, and 7-day change summary scoped to accessible categories.

2. Runs (`/api/runs`)

- paginated/sortable run list.

3. Run detail (`/api/runs/:id`)

- run metadata, scoped product and change sections.

4. Changes explorer (`/api/changes`)

- cross-run change feed with filtering by type, category subtree, preorder, query, window, and sort.

5. Product detail/history (`/api/products/:id`, `/api/products/:id/history`)

- canonical product profile + snapshot timeline scoped to user access.

6. Product quick search (`/api/products/search`)

- scoped product lookup by product/category token matching.

## 4.6 Notifications

1. Notification channels are user-managed (email currently supported in runtime behavior).
2. Invariants keep one active default email channel when possible.
3. Delivery lifecycle statuses: `PENDING`, `SENT`, `FAILED`, `SKIPPED`.
4. Immediate sender processes paid/admin deliveries.
5. Digest sender batches free-user deliveries and marks sent in bulk per digest cycle.

## 5. Frontend Functionality Map

Main authenticated app routes:

1. `/app` Dashboard Home

- Summary cards, latest runs, failures, and drill-down links.

2. `/app/runs`

- Run list with filters and sorting.

3. `/app/changes`

- Changes explorer table with filters and row click navigation to product detail.

4. `/app/runs/$runId`

- Run detail with changes/products sections and table controls.

5. `/app/products/$productId`

- Product hero details, history chart/table controls, and watch/unwatch actions.

6. `/app/settings`

- Tracking (categories/products), notification channels, session controls, and admin scheduler tools (admin only).

Auth routes:

1. `/login`, `/register`
2. `/forgot-password`, `/reset-password`
3. `/verify-email`
4. OAuth callback error handling through login search params

## 6. End-to-End Operational Flows

## Flow A: Scheduled category tracking

1. User subscribes to a category.
2. Scheduler sees category due and enqueues job.
3. Worker runs scrape for category.
4. Diff engine writes changes.
5. Deliveries are created and sent according to role/channel policy.
6. Frontend updates become visible in dashboard/runs/changes/product history.

## Flow B: Admin manual run

1. Admin triggers category run in settings/runs controls.
2. Queue receives manual job even if category has zero subscribers.
3. Worker executes scrape and updates `nextRunAt`.
4. Run appears in admin-visible runs stream and related views.

## Flow C: User watchlist lifecycle

1. User watches product reachable from subscribed categories.
2. Product appears in tracked products and badges across tables.
3. User unsubscribes from category.
4. If watched product is no longer reachable through any active subscribed category, watch is auto-disabled.

## 7. User Stories by Functional Area

## 7.1 Authentication and Account Security

1. As a new user, I can register with email/password and receive a verification flow.
2. As an existing user, I can sign in and maintain session continuity via refresh cookies.
3. As a user, I can reset my password without exposing whether an account exists.
4. As a security-conscious user, I can enable MFA and use recovery codes.
5. As a user with Google account, I can sign in with OAuth when enabled and permitted by account policy.
6. As an admin, I remain protected by stricter auth policy decisions.

## 7.2 Category Tracking and Scope

1. As a free user, I can track up to 3 combined category/product slots.
2. As a paid user, I can track up to 6 combined slots.
3. As an admin, I can bypass slot limits.
4. As a user, I only see run/change/product data from categories I track.
5. As a user, I can stop tracking a category and have inaccessible watches auto-cleaned.
6. As an admin, I can view scheduler state and tune category intervals.

## 7.3 Scraping and Change Detection

1. As the system, I can scrape due categories on schedule.
2. As the system, I can skip non-eligible categories safely.
3. As the system, I can retry transient failures with bounded retry budget.
4. As the system, I can identify price and stock transitions between runs.
5. As the system, I can avoid duplicate diff reports for the same run.

## 7.4 Dashboard and Runs

1. As a user, I can see latest run outcomes and recent failures quickly.
2. As a user, I can browse historical runs with pagination and sorting.
3. As a user, I can inspect one run's changed products and snapshots in detail.

## 7.5 Changes Explorer

1. As a user, I can filter by change type, category, preorder state, time window, and text query.
2. As a user, I can click rows to jump directly to product detail context.
3. As a user, I can identify watched products from badges in change lists.

## 7.6 Product Intelligence

1. As a user, I can quick-search products from the global header.
2. As a user, I can see current/original price, stock state, category tags, and recent run context.
3. As a user, I can review full snapshot history for a product.
4. As a user, I can watch/unwatch products relevant to my tracking scope.

## 7.7 Notifications

1. As a user, I can manage notification channels and default routing.
2. As a paid/admin user, I can receive immediate change alerts.
3. As a free user, I can receive periodic digest notifications.
4. As the system, I can preserve delivery audit state and error handling outcomes.

## 8. Operational Commands (Examples)

1. Refresh categories:
   `npm run categories:refresh --workspace=backend -- --apply`

2. Run scheduler:
   `npm run queue:scheduler --workspace=backend`

3. Run worker:
   `npm run queue:worker --workspace=backend`

4. Manual category scrape:
   `npm run scrape:category --workspace=backend -- <categorySlug>`

5. Run diff directly:
   `npm run diff:run --workspace=backend -- <scrapeRunId>`

6. Send notifications:
   `npm run notify:immediate --workspace=backend -- <changeReportId>`
   `npm run notify:digest --workspace=backend`

## 9. Notes for Future Reviews

1. Keep category refresh source assumptions under active monitoring, since site structure drift directly affects tracking quality.
2. Preserve parity between access-scope enforcement and scheduler eligibility rules.
3. Treat category hierarchy and descendant filtering as contract-level behavior, not UI-only detail.
4. When changing slot limits or role policy, update both backend capacity checks and frontend UX messaging together.
