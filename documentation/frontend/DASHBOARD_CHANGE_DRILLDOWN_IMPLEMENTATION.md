# Dashboard Summary Change Drilldown Implementation Plan

## Status

Implemented.

## Summary

Convert dashboard summary cards (`Price decreases`, `New products`, `Sold out`, `Back in stock`) into actionable links that open a dedicated change-results view with a paginated product-change table.

The implementation should reuse existing table/filter/pagination patterns and avoid creating a separate UI paradigm.

## Goals

1. Make dashboard summary metrics navigable to detailed product-level change data.
2. Reuse existing change table rendering logic and shared components.
3. Keep URL/search state as source of truth for filters and pagination.
4. Respect role/category access scope exactly as current dashboard/runs rules do.
5. Support parent-category selection where parent includes descendant category changes.
6. Enforce single-source implementations for query logic, search parsing, and table rendering (no parallel copies).
7. Ensure users always understand why they are seeing current results (or no results) after card deep-link navigation.

## Non-Goals

1. No redesign of dashboard layout beyond card clickability.
2. No changes to scrape/diff persistence model.
3. No notification/email changes in this phase.
4. No replacement of existing run-detail changes section behavior.

## Current State

Existing behavior:

1. Dashboard cards are informational only:
    - `frontend/src/features/runs/components/dashboard/dashboard-summary-grid.tsx`
2. Run detail has change table with filtering/pagination:
    - `frontend/src/features/runs/components/detail/run-changes-section.tsx`
3. Run detail change data is run-scoped (`/api/runs/:id/changes`).
4. No cross-run “changes explorer” endpoint currently exists.

## Product Decision (Locked)

1. Add a new protected route: `/app/changes`
2. Add a new backend endpoint: `GET /api/changes`
3. Dashboard cards deep-link to `/app/changes` with prefilled filters:
    - `changeType` from clicked card
    - `categoryId` from current dashboard category filter (if set)
    - default `windowDays=7`
4. Parent category filter includes all descendant category changes.
5. Non-admin users only see changes in categories they are allowed to access.
6. Implementation location is locked to existing `features/runs/*` for change-list concerns in this phase.
7. Existing `/api/runs/:id/changes` and new `/api/changes` must share one backend change-list query/service path.
8. Descendant category resolution must reuse existing shared helper service, not copy logic.

## Information Architecture

## New route

1. `/app/changes`

## URL search contract

1. `page` (default `1`)
2. `pageSize` (default `25`)
3. `sortBy` (default `changedAt`)
4. `sortOrder` (default `desc`)
5. `changeType` (optional: `price_increase | price_decrease | new_product | sold_out | back_in_stock`)
6. `categoryId` (optional UUID)
7. `windowDays` (default `7`; constrained to supported values, e.g. `1 | 7 | 30`)

## Backend API Plan

## Endpoint

1. `GET /api/changes`
2. Existing `GET /api/runs/:id/changes` remains, but both endpoints must call the same internal change-list query builder.

## Query params

1. `page`
2. `pageSize`
3. `sortBy`
4. `sortOrder`
5. `changeType`
6. `categoryId`
7. `windowDays`

## Response shape

1. `items[]` each containing:
    - change item fields:
        - `id`
        - `changeType`
        - `oldPrice`
        - `newPrice`
        - `oldStockStatus`
        - `newStockStatus`
    - product context:
        - `product.id`
        - `product.name`
        - `product.externalUrl`
    - run/report/category context:
        - `category.id`
        - `category.nameEt`
        - `run.id`
        - `run.startedAt`
        - `report.createdAt` (or unified `changedAt`)
2. pagination envelope:
    - `page`
    - `pageSize`
    - `totalItems`
    - `totalPages`

## Access control

1. Admin: full scope.
2. Free/Paid: tracked category scope only.
3. If `categoryId` outside scope -> behave as empty result (consistent with existing scoped listing patterns).

## Category hierarchy behavior

1. If `categoryId` points to parent, include all descendant category IDs.
2. Reuse shared hierarchy helper from `backend/src/services/category-hierarchy.service.ts` (or the existing canonical helper module), not a route-local implementation.

## Backend duplication guardrails

1. Add a shared service function, example:
    - `listChangesWithScope({ userId, role, runId?, changeType?, categoryId?, windowDays, page, pageSize, sortBy, sortOrder })`
2. Use this same function from:
    - `/api/changes`
    - `/api/runs/:id/changes`
3. Keep one Zod schema family for change-item output and pagination envelope.
4. If new fields are added for `/api/changes`, extend existing change DTO/schema instead of creating parallel near-identical types.

## Frontend Implementation Plan

## 1) Route and search schema

Add route + search parsing:

1. `frontend/src/routes/changes-page.tsx`
2. `frontend/src/features/runs/search.ts` (locked; do not create a parallel `features/changes/search.ts` in this phase)
3. Router wiring in `frontend/src/app/router.tsx`

## 2) Query layer

Add new query:

1. `useChangesListQuery(...)` in `frontend/src/features/runs/queries.ts` (locked location)
2. Add schema for response validation in `frontend/src/features/runs/schemas.ts` (locked location)
3. Add query keys in `frontend/src/lib/query/query-keys.ts`

Query duplication guardrail:

1. Reuse shared query-string builder and query key naming conventions already used in runs queries.
2. Do not create duplicated “changes list” query helpers in multiple files.

## 3) Reuse table UI

Preferred approach:

1. Extract reusable change-table section from run-detail:
    - shared table section component for change items with:
        - change-type filter
        - pagination controls
        - empty/error/loading states
2. Reuse existing `DataTable`, `AppSelect`, and `PaginationControls`.

Files likely affected:

1. `frontend/src/features/runs/components/detail/run-changes-section.tsx` (extract shared internals)
2. New shared component file under runs/changes area (single source used by both pages)
3. `frontend/src/features/runs/hooks/use-run-detail-columns.tsx` (extract shared change columns if needed)

UI duplication guardrail:

1. `RunChangesSection` and `/app/changes` must compose the same extracted `ChangesTableSection` component.
2. Column definitions for common fields must come from one shared hook/factory.
3. Do not duplicate status/detail rendering logic across two components.

## 4) Dashboard summary card linking

Update:

1. `frontend/src/features/runs/components/dashboard/dashboard-summary-grid.tsx`

Behavior:

1. Each card becomes keyboard-accessible link/card-button.
2. Link destination:
    - `to="/app/changes"`
    - includes `changeType`, `windowDays=7`, and dashboard `categoryId` if present.

## 5) UX details

Changes page should include:

1. heading + short explainer
2. active filter context summary block (always visible above table), for example:
    - `Showing: Sold out`
    - `Category: Marvel Comics (including sub-categories)`
    - `Window: Last 7 days`
    - `Sorted by: Changed at (Newest first)`
3. a `Reset all filters` control that restores default search state in one action
4. filters:
    - change type
    - category tree select
    - time window
    - page size
5. table columns:
    - change type
    - product
    - details (`old -> new`)
    - category
    - changed at / run time
    - links (`Open product`, `Open run`)

## State and Recovery UX Contract

1. Loading state:
    - show table skeleton/loading rows and keep filter controls visible.
2. Error state:
    - show explicit error message + `Retry` action.
    - preserve current URL/search state so retry keeps user context.
3. Empty state with active filters:
    - message explains that current filters may narrow out dashboard card totals.
    - include `Reset all filters` action.
4. Mismatch explanation:
    - when card deep-link count is non-zero but current table is empty, show helper text:
        - `Dashboard card totals are aggregate counts for the selected window. Additional filters may reduce visible rows.`
5. No data state (no filters):
    - show neutral empty copy with guidance to change time window or category.

## Mobile and Responsive Rules

1. Filters collapse into stacked layout on small screens (single-column controls).
2. `Reset all filters` remains visible without horizontal scrolling.
3. Table keeps horizontal overflow behavior consistent with existing data table pattern.
4. Column priority on narrow screens:
    - keep `Change`, `Product`, and `Details` always visible;
    - lower-priority columns (`Category`, `Run`) may truncate with clear link text preserved.

## Accessibility Rules

1. Dashboard summary cards must have a single interactive root element per card (no nested interactive children).
2. Each card link must have an accessible name that includes metric context, for example:
    - `View sold out changes (24)`.
3. Visible focus styles are required for card links and all filter controls.
4. Touch target minimum should be at least 44x44 for card interactions.
5. Changes page must expose filter context block to screen readers as regular text, not color-only badges.

## User Stories

1. As a user, I can click `New products` on dashboard and immediately see those product changes.
2. As a user, I can click `Sold out` and see only sold-out products.
3. As a user, I can further filter by category and time window in the changes view.
4. As a user, I can open affected product or related run directly from the table.
5. As a non-admin user, I only see changes for categories I’m authorized to view.
6. As an admin, I can inspect all categories from one changes explorer.

## Edge Cases

1. Dashboard card count is non-zero but current scoped filter yields no rows after deeper filters.
2. `categoryId` in URL is invalid UUID -> parser fallback to undefined.
3. `categoryId` is valid but inaccessible -> empty result, no leakage.
4. Parent category selected with no descendant changes in window -> empty state.
5. Out-of-range page -> clamp to last valid page.
6. Backend returns large datasets -> pagination remains stable.

## Testing Plan

## Backend tests

1. `GET /api/changes` requires auth.
2. Non-admin scope enforcement.
3. Admin full-scope access.
4. `changeType` filter works.
5. Parent `categoryId` includes descendant changes.
6. Pagination + sorting + validation behavior.

## Frontend tests

1. Dashboard summary cards render as links.
2. Clicking each card routes to `/app/changes` with expected search params.
3. Changes page renders table rows from query data.
4. URL state drives filter state and vice versa.
5. Category parent selection includes descendant results (integration expectation from API).
6. Empty/error states render correctly.
7. Run detail and `/app/changes` use the same shared change-table section (structural regression test).
8. `Reset all filters` restores default search state.
9. Active filter context block reflects URL search params accurately.
10. Mismatch helper copy appears when deep-linked filtered result is empty.
11. Card links expose accessible names with metric context.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run test --workspace=backend`
3. `npm run build --workspace=backend`
4. `npm run lint --workspace=frontend`
5. `npm run test --workspace=frontend`
6. `npm run build --workspace=frontend`

## Acceptance Criteria

1. Dashboard summary cards are clickable and route to filtered `/app/changes`.
2. `/app/changes` exists and is protected.
3. `/api/changes` returns paginated, scoped, filterable change items.
4. Category parent filtering includes descendants.
5. Existing run-detail changes section still works (no regression).
6. Reused table/filter/pagination components avoid duplicate UI logic.
7. Backend and frontend tests cover main drilldown flows.
8. No duplicated descendant-category logic exists in new backend code paths.
9. No parallel search/query/schema modules are introduced for the same concern.
10. `/app/changes` shows persistent active-filter context and a one-click `Reset all filters` action.
11. Empty/error/loading states follow the defined recovery UX contract.
12. Dashboard summary cards meet keyboard and screen-reader interaction requirements.

## Risks and Mitigations

1. Risk: route/search duplication with run-detail change filters.
   Mitigation: extract shared change table/filter component and shared search helpers.
2. Risk: backend query complexity/perf on large change_items table.
   Mitigation: constrain `windowDays`, paginate, and add required indexes if needed.
3. Risk: inconsistent scope handling between dashboard, runs, and changes.
   Mitigation: reuse existing access-scope helpers and descendant-category helper strategy.
4. Risk: backend and frontend code forks into near-identical “changes” implementations.
   Mitigation: lock implementation location and shared component/service contracts in this plan.
