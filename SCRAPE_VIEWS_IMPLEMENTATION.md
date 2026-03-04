# Scrape Views Implementation Plan

## Status

Implemented.

This document originally covered the first three Phase 4 scrape-oriented views. Those views are now complete, and the Phase 4 product-history follow-up work has also been delivered.

Completed Phase 4 outcomes tied to this plan:

- protected dashboard home is implemented against real backend data
- scrape runs list is implemented with URL-backed pagination, sorting, and filters
- scrape run detail is implemented with run summary, diff items, and product snapshots
- route-level loaders/prefetching are implemented with TanStack Router + Query
- product detail / price-history is implemented as the next connected drill-down
- product-history route is lazy-loaded so chart code is no longer in the main authenticated entry bundle
- product-history controls are URL-backed and include:
  - time range
  - category filter
  - stock filter
  - original-price toggle
  - stock-overlay toggle

Related follow-up implementation record:

- [FURTHER_IMPLEMENTATIONS.md](/Users/fredkorts/Documents/Development/Personal Projects/scraper/FURTHER_IMPLEMENTATIONS.md)

## 1. Scope

This plan covers the first three Phase 4 dashboard items from `REQUIREMENTS.md`:

- protected dashboard home
- scrape runs list view
- scrape run detail view

This plan assumes the Phase 3 frontend foundation is already complete:

- TanStack Router route tree
- protected app shell
- TanStack Query data layer
- shared `DataTable`
- SCSS token/base architecture

Phase 4 expansion note:

- the product detail / price-history view was implemented immediately after these three core scrape views because the run detail screen now links directly into product-level history analysis

## 2. Current Constraint

These views are **not frontend-only work**.

The frontend foundation exists, but the backend currently does **not** expose the run-focused APIs required by these screens. Right now the backend has:

- `GET /api/auth/me`
- notification channel CRUD
- `GET /api/categories`
- `GET /api/health`

Before the three views can be completed against real data, we need backend endpoints for:

- `GET /api/dashboard/home`
- `GET /api/runs`
- `GET /api/runs/:id`
- `GET /api/runs/:id/products`
- `GET /api/runs/:id/changes`

That dependency should be implemented first, or at minimum in parallel with the frontend view work.

## 2.1 Authorization Scope

These views must respect the existing subscription and role model.

Access rules:

- `free` and `paid` users only see scrape data for categories they actively track
- `admin` users can see all scrape data
- every run-oriented endpoint must enforce category-level authorization consistently

This applies to:

- dashboard home summaries
- runs list items
- run detail metadata
- run products
- run diff items

## 3. Goals

1. Deliver the first real authenticated dashboard views using the new frontend foundation.
2. Keep route state, query state, and table state aligned with the Phase 3 architecture.
3. Make the views useful immediately, without overbuilding filters, charts, or controls too early.
4. Ensure each screen is testable, accessible, and backed by typed contracts.

## 4. View Definitions

## 4.1 Dashboard Home

Purpose:

- give the logged-in user one high-signal overview screen
- show recent scraper health and change activity
- expose quick actions that lead into deeper views

Recommended contents:

- latest scrape status summary
- recent completed/failed runs
- recent change totals by type
- quick links:
  - view all runs
  - open latest failed run
  - open latest run with changes

Keep this screen summary-oriented. Do not turn it into a second runs list.

## 4.2 Scrape Runs List

Purpose:

- provide the operational view of past scrape executions
- make it easy to scan status, category, time, duration, and changes

Recommended table columns:

- started at
- category
- status
- total products
- total changes
- duration
- actions / open detail

Recommended first-pass table capabilities:

- pagination
- server-side sorting
- status filter
- category filter

Do not add column customization or bulk actions yet.

## 4.3 Scrape Run Detail

Purpose:

- show what happened in one specific scrape run
- connect top-level run metadata to the actual product and diff outputs

Recommended sections:

- run summary card
  - category
  - status
  - started/completed timestamps
  - duration
  - total products
  - change counters
- diff items section
  - recent price decreases/increases
  - sold out / back in stock
  - new products
- products table section
  - product name
  - current price
  - original price
  - stock state
  - product link

The detail view should answer two questions clearly:

- did the run succeed?
- what changed?

## 5. Backend API Requirements

All new backend endpoints in this plan are protected endpoints and must validate both:

- authenticated user identity
- category-scoped access based on active subscriptions unless the user role is `admin`

## 5.1 `GET /api/dashboard/home`

Return one dashboard-specific response instead of forcing the frontend to assemble it from multiple unrelated endpoints.

Scope rule:

- return only data for categories the current user is allowed to see

Suggested payload:

- latest runs summary
- recent failed runs
- recent runs with changes
- aggregate change counts over a recent window

Suggested shape:

```ts
interface DashboardHomeResponse {
    latestRuns: Array<{
        id: string;
        categoryId: string;
        categoryName: string;
        status: "pending" | "running" | "completed" | "failed";
        startedAt: string;
        completedAt?: string;
        totalChanges: number;
        totalProducts: number;
    }>;
    recentFailures: Array<{
        id: string;
        categoryName: string;
        startedAt: string;
        errorMessage?: string;
    }>;
    recentChangeSummary: {
        priceIncrease: number;
        priceDecrease: number;
        newProduct: number;
        soldOut: number;
        backInStock: number;
    };
}
```

## 5.2 `GET /api/runs`

This endpoint should support server-side pagination and sorting from day one.

Suggested query params:

- `page`
- `pageSize`
- `sortBy`
- `sortOrder`
- `status`
- `categoryId`

Validation rules:

- validate all query params on the backend with an allow-listed schema
- validate route search params on the frontend with `zod`
- clamp `page` to a minimum of `1`
- clamp `pageSize` to a safe maximum such as `100`
- allow only explicit sortable fields, for example:
  - `startedAt`
  - `status`
  - `totalChanges`
  - `totalProducts`
  - `durationMs`
- reject or normalize invalid filters instead of passing them through

Default sorting:

- `startedAt desc`
- tie-breaker: `id desc`

Suggested response:

```ts
interface RunsListResponse {
    items: Array<{
        id: string;
        categoryId: string;
        categoryName: string;
        status: "pending" | "running" | "completed" | "failed";
        totalProducts: number;
        totalChanges: number;
        pagesScraped: number;
        durationMs?: number;
        startedAt: string;
        completedAt?: string;
        errorMessage?: string;
    }>;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
```

## 5.3 `GET /api/runs/:id`

Return the run summary only. Keep products and diff items in companion endpoints so the frontend can cache them independently.

Authorization rule:

- return `404` for inaccessible or missing run ids so unauthorized users cannot enumerate valid run ids

## 5.4 `GET /api/runs/:id/products`

Suggested first-pass query params:

- `page`
- `pageSize`
- optional `inStock`

This endpoint should return the per-run snapshot rows, not canonical product-only state, because the screen is about a specific run.

Validation rules:

- validate `page`, `pageSize`, and `inStock`
- clamp `pageSize` to a safe maximum

Default sorting:

- `name asc`
- tie-breaker: `id asc`

## 5.5 `GET /api/runs/:id/changes`

Return diff items tied to the run’s canonical `change_report`.

Suggested query params:

- `page`
- `pageSize`
- optional `changeType`

Validation rules:

- validate `page`, `pageSize`, and `changeType`
- allow only known `changeType` values
- clamp `pageSize` to a safe maximum

Default sorting:

- most recent changes first
- tie-breaker: `id desc`

## 6. Frontend Route Plan

Add or refine these routes:

- `/app`
- `/app/runs`
- `/app/runs/$runId`
- `/app/products/$productId`

Route responsibilities:

- `/app`
  - loader prefetches dashboard home query
- `/app/runs`
  - validates URL search params
  - loader prefetches runs list query using search params
- `/app/runs/$runId`
  - validates `runId`
  - loader prefetches run summary
  - loader may also prefetch first page of products and changes
- `/app/products/$productId`
  - loader prefetches product detail and product history
  - route is lazy-loaded so the charting code only loads when the user opens a product
  - validates URL-backed product-history control state

Route rules:

- route search params are the single source of truth for runs list pagination, sorting, and filtering
- route search params are also the single source of truth for product-history analytical controls
- invalid search params are normalized to safe defaults
- route transitions should preserve shareable URLs for list state

## 7. Frontend Data Layer Plan

Add a new feature area:

- `frontend/src/features/runs/`
- `frontend/src/features/products/`

Suggested files:

- `queries.ts`
- `schemas.ts`
- `search.ts`
- `formatters.ts`
- `components/RunSummaryCard.tsx`
- `components/RunChangesList.tsx`
- `components/RunProductsTable.tsx`
- `components/RunsTable.tsx`
- `components/DashboardHomePanels.tsx`
- `history-controls.ts`
- `queries.ts`
- `schemas.ts`

Required query keys:

- `dashboard.home()`
- `runs.list(params)`
- `runs.detail(runId)`
- `runs.products(runId, params)`
- `runs.changes(runId, params)`
- `products.detail(productId)`
- `products.history(productId)`

Runtime validation should be added for all new response payloads before data reaches view components.

## 8. UI and State Rules

- TanStack Query owns server state.
- TanStack Router search params own runs list pagination/filter/sort state.
- TanStack Table renders list state, but the backend remains the source of truth for sorted/paginated data.
- Local UI state should stay small:
  - expanded cards
  - selected diff filter chips
  - temporary panel toggles
- Product-history controls are URL-backed, not local-only:
  - `range`
  - `categoryId`
  - `stockFilter`
  - `showOriginalPrice`
  - `showStockOverlay`

Do not add a global client store for these views.

## 9. Component and UX Rules

All new view styles must follow the existing frontend foundation:

- component styles use `*.module.scss`
- spacing, colors, typography, radius, motion, and shadows come from shared tokens only
- no hardcoded magic values when an existing token covers the case
- shared primitives should be reused where they already exist

## 9.1 Dashboard Home

- use compact summary cards and short lists
- prioritize signal over density
- every summary block should have a clear link to the next action
- empty states should explain whether no runs exist yet or no recent failures/changes were found

Accessibility rules:

- the page must have one primary `h1`
- summary cards must remain readable in keyboard and screen-reader flow
- quick-action links need clear text, not icon-only affordances

## 9.2 Runs List

- use the shared `DataTable`
- keep sorting and pagination URL-backed
- preserve previous page data during transitions
- failed runs should visually stand out without relying on color alone

Accessibility and semantics:

- table headers must be semantic column headers
- loading, empty, and error states must be announced clearly in text
- sortable controls must expose current sort direction
- row actions must have explicit accessible names

## 9.3 Run Detail

- top summary first
- changes second
- products third
- separate error state for failed runs:
  - show `errorMessage`
  - still show whatever metadata is available

Accessibility and semantics:

- move focus to the page heading on initial route load
- failed-run messaging should be in a clearly labeled error/status region
- change items should be grouped or labeled so screen readers can distinguish change type and affected product
- stock and status indicators must include text, not color alone

## 9.4 Product Detail / Price History

- product history is the natural drill-down from run detail product rows and diff items
- the chart is not the only representation of historical data; the filtered history table remains visible
- filtered summary cards, chart lines, and history table rows must stay in sync
- original-price and stock overlays are optional controls so the default chart remains readable

Accessibility and semantics:

- the page must keep one primary `h1`
- all product-history controls must use labeled native form controls
- empty filtered results must render a clear explanatory text state
- chart-only information must also be available in table/text form

## 10. Testing Plan

## 10.1 Backend

- controller/service tests for all new run/dashboard endpoints
- pagination and sorting tests for `GET /api/runs`
- authorization tests for all protected endpoints
- category-scope authorization tests for subscribed vs unsubscribed users
- admin visibility tests for global access
- `404` tests for missing run ids
- `404` tests for inaccessible run ids
- schema/serialization tests for response shape stability
- query param validation tests for invalid sort/filter/page values

## 10.2 Frontend

- route loader tests for:
  - `/app`
  - `/app/runs`
  - `/app/runs/$runId`
  - `/app/products/$productId`
- component tests for:
  - dashboard summary rendering
  - runs table rendering
  - run detail summary and diff sections
  - product detail summary and history sections
- URL state tests:
  - changing table sort updates search params
  - pagination reads from and restores from URL
  - changing product-history controls updates route search params
- accessibility tests:
  - heading structure
  - table headers
  - keyboard navigation
  - empty/error states
  - non-color status communication
  - focus placement on route change
- unit tests for product-history control parsing, filtering, and summary derivation

## 11. Implementation Order

1. Add backend response contracts and route/service plan for dashboard home and run endpoints.
2. Implement backend endpoints and tests.
3. Add shared frontend schemas and feature queries for dashboard/runs data.
4. Replace current placeholder `/app` home with real dashboard panels.
5. Replace current mock `/app/runs` table with real paginated query-driven table.
6. Add `/app/runs/$runId` route and build the run detail screen.
7. Add route loaders/prefetch and URL search param validation.
8. Add `/app/products/$productId` route and build the product detail / history screen.
9. Add product-history route splitting and URL-backed analytical controls.
10. Add frontend tests for loaders, views, table/search behavior, product-history controls, and accessibility.
11. Mark the roadmap items complete only after backend + frontend verification passes.

## 12. Acceptance Criteria

The three roadmap items are complete when:

- authenticated users can open `/app` and see real dashboard summary data
- `/app/runs` renders real paginated/sortable run data from backend APIs
- `/app/runs/$runId` shows real run metadata, diff items, and product snapshot data
- `/app/products/$productId` shows real product detail and historical price data
- route loaders prefetch data using the established TanStack Router + Query pattern
- response payloads are runtime-validated on the frontend
- URL state restores the runs list view correctly
- URL state restores the product-history control state correctly
- backend tests pass for the new endpoints
- frontend `build`, `lint`, and `test` pass

## 13. Risks

Risk: dashboard home becomes a grab-bag of metrics with weak user value.

Mitigation:

- keep it focused on operational signal and drill-down links

Risk: runs list sorting/filtering is implemented twice, once in URL state and once in component state.

Mitigation:

- make Router search params the single source of truth

Risk: run detail is overloaded with too much data on first paint.

Mitigation:

- split summary, products, and changes into separate queries if needed

Risk: frontend gets ahead of backend contract design.

Mitigation:

- define response shapes first, then implement backend and frontend against those contracts
