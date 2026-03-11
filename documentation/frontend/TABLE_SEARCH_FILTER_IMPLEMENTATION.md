# TABLE_SEARCH_FILTER_IMPLEMENTATION.md

## Status

Implemented (March 10, 2026).

## Summary

Add an input search filter to:

1. Run Detail view tables (`Diff Items`, `Product Snapshots`)
2. Changes Explorer table
3. Category Schedule State table

The plan uses server-side filtering for URL-backed paginated views and local filtering for admin scheduler state.

## Goals

1. Improve findability in dense table views.
2. Keep behavior consistent across views.
3. Preserve existing routing/search-state patterns.
4. Maintain accessibility and keyboard usability.
5. Avoid query storms and pagination inconsistencies.

## Non-Goals

1. Full-text search infrastructure.
2. Replacing existing category/change/stock filters.
3. Reworking table architecture beyond required search integration.

## UX Decisions

1. Use a shared `TableSearchInput` component based on existing `AppInput`.
2. Search interactions are consistent across surfaces:
    - search icon + clear control
    - placeholder text aligned with table context
    - debounce typing input
    - page resets to 1 when search changes
3. Show contextual feedback:
    - active filter summary
    - distinct empty states for “no data” vs “no match”
4. Accessibility baseline:
    - explicit label/aria-label per search input
    - clear control has accessible name
    - result count updates announced through a polite live region
5. Debounce ownership:
    - debounce is implemented in route/container search state logic only
    - `TableSearchInput` remains presentational and does not implement its own debounce.

## Architecture Decisions

1. Server-side filtering for URL-backed paginated tables:
    - Run Detail `changes` and `products`
    - Changes Explorer
2. Local client-side filtering for Category Schedule State:
    - runs in admin settings view
    - combined with existing category tree filter via `AND` logic
3. Distinct URL params for Run Detail tables:
    - `changesQuery`
    - `productsQuery`
4. Changes Explorer URL param:
    - `query`
5. Backend validation:
    - trim input
    - max length 100
    - optional minimum non-empty length rule if needed later
6. URL update strategy for debounced search:
    - use search-param updates with `replace: true` while typing/debouncing
    - optionally `push` only on explicit submit actions (if submit UI is introduced)
7. Search request race strategy:
    - all search-driven query functions must honor TanStack Query `signal` and pass it to API client
    - stale in-flight responses must not overwrite the latest search state.

## Search Scope by View

1. Run Detail: Diff Items
    - product name
    - category label (if present in row payload)
    - change type label text
2. Run Detail: Product Snapshots
    - product name
    - product external URL
3. Changes Explorer
    - product name
    - category label
    - change type label text
4. Category Schedule State
    - category path/name
    - queue status/eligibility labels

## Search Semantics (Locked)

1. Matching mode: case-insensitive `contains`.
2. Tokenization: split by whitespace and apply `AND` across tokens.
3. Diacritics handling:
    - keep default DB collation behavior initially,
    - add follow-up only if UX testing shows meaningful false negatives.
4. Empty query:
    - treated as no search filter.
5. Scheduler table local search:
    - match both leaf category name and full category path label.

## File-Level Plan

## New shared component

1. `frontend/src/components/table-search-input/TableSearchInput.tsx`
2. `frontend/src/components/table-search-input/table-search-input.module.scss`
3. `frontend/src/components/table-search-input/types/table-search-input.types.ts`
4. `frontend/src/components/table-search-input/TableSearchInput.test.tsx`

## Frontend route/search wiring

1. `frontend/src/features/runs/search.ts`
    - add `changesQuery`, `productsQuery`, `query` parsing/defaults
2. `frontend/src/app/router.tsx`
    - ensure route loader deps include new query params
3. `frontend/src/features/runs/queries.ts`
    - include new query params in request payload and query keys
4. `frontend/src/lib/api/schemas.ts` and related runtime schemas
    - keep frontend runtime parsing/validation contract synchronized with backend query contract.

## Run Detail UI

1. `frontend/src/routes/run-detail-page.tsx`
2. `frontend/src/features/runs/components/detail/run-changes-section.tsx`
3. `frontend/src/features/runs/components/detail/run-products-section.tsx`

## Changes Explorer UI

1. `frontend/src/routes/changes-page.tsx`
2. `frontend/src/features/runs/components/list/changes-filters.tsx`

## Category Schedule State UI

1. `frontend/src/features/settings/components/admin-scheduler-state-table.tsx`
    - add local text query state
    - compose with existing category filter (`AND`)
    - reset page on query change

## Backend API filtering

1. `backend/src/schemas/runs.ts`
    - validate search query params
2. `backend/src/services/runs.service.ts`
    - apply auth-scoped search filters for:
        - run changes
        - run products
        - global changes
3. `backend/src/routes/runs.test.ts`
    - add coverage for new search behavior
4. `shared/src/index.ts` (if request/response contracts are extended)
    - update shared contract types in the same pass.

## Performance and Safety Guardrails

1. Debounce search input updates by ~350ms.
2. Avoid firing search requests on empty query (use existing path).
3. Keep backend query constrained by indexed/auth-scoped predicates first, then text match.
4. Keep all filtering scoped by existing authorization boundaries.
5. Query cancellation:
    - pass `AbortSignal` through all search-driven API calls.
6. Backend verification:
    - capture query plan for run products/run changes/changes explorer search paths,
    - add follow-up index task if plan shows sequential-scan regressions at expected production sizes.
7. Client-side normalization parity:
    - trim and collapse repeated whitespace before writing search value to URL params,
    - enforce max length 100 in UI state to mirror backend validation and reduce needless requests.

## UX Copy Rules

1. Base empty state (no records):
    - existing empty copy remains.
2. Filtered empty state (query active with no matches):
    - “No rows matched the current search. Clear search or adjust filters.”
3. Optional hint when other filters are active:
    - “Additional filters may reduce visible rows.”

## Test Plan

## Frontend tests

1. URL param updates when user types search.
2. Back/forward navigation restores search input state.
3. Page resets to 1 when search changes.
4. Empty-state messaging changes correctly for active query.
5. Accessibility:
    - input label exists
    - clear button has accessible name
    - live region updates on result count
6. Debounce behavior:
    - requests are delayed until debounce window elapses.
7. Navigation behavior:
    - typing/debounce updates use history replace semantics (no history spam).
8. Race behavior:
    - stale responses from older search terms do not replace newer results.
9. Debounce ownership:
    - verify only one debounce layer exists (container-level), with no additional delay from `TableSearchInput`.

## Backend tests

1. Run changes endpoint respects search + existing filters.
2. Run products endpoint respects search + stock filter.
3. Changes explorer endpoint respects search + category/changeType/window filters.
4. Query validation rejects oversized input.
5. Search results remain authorization-scoped for non-admin users.

## Category Schedule State tests

1. Combined local filter behavior:
    - category tree filter + text query use `AND` logic.
2. Pagination interaction:
    - page resets to 1 when either category or text filter changes.
3. Empty-state behavior:
    - filtered-empty copy appears only when filters are active.

## Verification Commands

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`
4. `npm run lint --workspace=backend`
5. `npm run test --workspace=backend`

## Acceptance Criteria

1. Each target table has a visible, accessible search input.
2. Run Detail and Changes Explorer search state is URL-backed and shareable.
3. Category Schedule State search composes correctly with category filter.
4. Search on paginated server-backed tables returns correct cross-page results.
5. Typing search does not create request storms.
6. Existing filters/sorts/pagination continue to work with search enabled.
7. Frontend and backend tests for new search behavior pass.
8. Browser back navigation remains usable (no per-keystroke history stack growth).
9. Search results remain stable under rapid typing (no stale-response flicker/regression).
