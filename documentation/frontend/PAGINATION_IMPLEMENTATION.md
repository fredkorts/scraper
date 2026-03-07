# Table Pagination Implementation Plan

## Summary

Implement one reusable pagination system for all data-heavy table views in the frontend.  
Primary UX goals:

- make navigation clearer (`First`, `Previous`, page numbers, `Next`, `Last`)
- keep behavior consistent across screens
- preserve URL-backed state and existing query architecture
- keep controls accessible and keyboard/screen-reader friendly

This plan is aligned with the current stack:

- React + TypeScript
- TanStack Router (URL search state)
- TanStack Query (server data fetching)
- TanStack Table (table rendering/state)
- SCSS modules + shared token/mixin foundation

## Current Gaps

Current pagination controls are minimal:

- only `Previous` + `Next`
- no quick jump to first/last page
- no page-number context beyond `Page X`
- repeated pagination markup across routes

## Scope

Apply the shared pagination pattern to:

1. Runs list table (`/app/runs`)
2. Run detail diff items table (`/app/runs/$runId`, changes section)
3. Run detail product snapshots table (`/app/runs/$runId`, products section)
4. Product history table (`/app/products/$productId`) when server-side pagination is enabled for this endpoint

Rollout note:

- if product history backend pagination is not implemented in the same PR, this plan still requires a follow-up ticket in the same milestone so pagination UX does not fragment across Phase 4 tables

## UX Specification

Each paginated table section will show:

1. `First page` button
2. `Previous page` button
3. page number buttons with a compact window (example: `1 ... 12 13 [14] 15 16 ... 42`)
4. `Next page` button
5. `Last page` button
6. compact summary text:
    - `Page 14 of 42`
    - `Showing 326-350 of 1,032`

Behavior rules:

- first/previous disabled on page 1
- next/last disabled on last page
- page button list never renders all pages for very large totals; use ellipsis windows
- if there is only one page, hide button controls and show summary text only
- while a pagination request is in-flight, disable controls to prevent rapid duplicate interactions

## Accessibility Rules

Pagination must render inside a semantic `<nav>` with section-specific labels:

- `aria-label="Runs pagination"`
- `aria-label="Run changes pagination"`
- `aria-label="Run products pagination"`

Additional requirements:

- active page button uses `aria-current="page"`
- disabled state is reflected via `disabled` attribute
- button names are descriptive (`Go to first page`, `Go to page 14`)
- focus order follows visual order and remains keyboard operable
- include an `aria-live="polite"` status region that announces page/range updates after navigation
- do not force focus jumps on ordinary page changes; keep interaction stable and rely on live status updates

## Architecture and Reuse

Create a shared component:

- `frontend/src/components/pagination/PaginationControls.tsx`
- `frontend/src/components/pagination/PaginationControls.module.scss`

Create helper utilities:

- `frontend/src/components/pagination/page-window.ts`
- `frontend/src/components/pagination/page-window.test.ts`

Recommended component API:

```ts
interface PaginationControlsProps {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    isLoading?: boolean;
    ariaLabel: string;
    onPageChange: (nextPage: number) => void;
}
```

Notes:

- Keep pagination state controlled by route components.
- Do not add internal hidden pagination state in the shared component.
- Page-size selectors remain route-specific for now, since each screen already has filter toolbars.
- Component computes range text from `page`, `pageSize`, and `totalItems`.
- Component supports compact mobile rendering (reduced numeric window).

## URL/Search-State Rules

1. URL search remains source of truth for current page.
2. Changing filter/sort/page-size resets the affected page to `1`.
3. When data returns and `page > totalPages`, clamp and navigate to the last valid page using router `replace` semantics (not `push`) to avoid polluting browser history.
4. Keep existing max page-size guards (`<= 100`) in search parsing and backend validation.
5. Enforce backend deep-page guardrails:
    - cap `page` and/or `offset` to a safe maximum
    - reject out-of-budget requests with a clear validation response

## Backend Pagination Contract

All paginated endpoints used by these screens must follow one shared contract:

1. deterministic ordering:
    - explicit sortable field + stable tie-breaker (`id`)
2. validated input:
    - bounded `page`
    - bounded `pageSize`
3. stable response shape:
    - `items`, `page`, `pageSize`, `totalItems`, `totalPages`
4. out-of-range behavior:
    - API may return empty `items` for out-of-range pages
    - frontend remains responsible for URL clamp/correction behavior
5. bounded query cost:
    - endpoint-level safeguards prevent pathological deep offset scans

## Implementation Steps

1. Build page-window helper (numeric window + ellipsis generation).
2. Build reusable `PaginationControls` component and styles.
3. Replace runs-page inline pagination with shared component.
4. Replace run-detail changes pagination with shared component.
5. Replace run-detail products pagination with shared component.
6. Add route-level clamping logic for out-of-range `page` values after fetch.
7. Add live status region and loading/disabled behavior wiring from query states.
8. Verify responsive layout in narrow widths with compact mode (no noisy wrapped pager rows).
9. Validate backend query guards and shared pagination contract across all affected endpoints.

## Test Plan

### Unit tests

1. `page-window` returns correct windows at start, middle, and end.
2. `page-window` handles low totals (1-5 pages) without ellipsis.
3. `page-window` never emits out-of-range page values.

### Component tests

1. first/previous disabled on page 1
2. next/last disabled on final page
3. `aria-current="page"` is set on active page button
4. clicking page buttons calls `onPageChange` with correct target page
5. controls are disabled while `isLoading` is true
6. single-page state renders summary-only without pager buttons

### Route tests

1. runs page uses new controls and updates URL page search param
2. run detail changes table uses isolated page state (`changesPage`) correctly
3. run detail products table uses isolated page state (`productsPage`) correctly
4. clamping behavior works when URL page exceeds returned total pages
5. page/range live region text updates after successful navigation
6. clamping uses history-safe replace behavior and does not spam browser back-stack

### Backend tests

1. paginated endpoints reject over-limit `page`/`offset` requests
2. paginated endpoints enforce bounded `pageSize`
3. deterministic ordering is stable across repeated calls with the same inputs

## Risks and Mitigations

Risk: duplicated pagination logic continues in routes.  
Mitigation: all table sections must use shared `PaginationControls`.

Risk: huge page counts produce noisy UI.  
Mitigation: compact window + ellipsis, never render full page list.

Risk: URL/data mismatch causes empty screens on high page numbers.  
Mitigation: clamp invalid page values after data load.

Risk: controls become crowded on small screens.  
Mitigation: compact mobile mode with fewer numeric buttons.

Risk: volatile totals can cause repeated clamp redirects.  
Mitigation: clamp only after successful settled data and use history `replace`.

Risk: unbounded deep-page queries can degrade DB performance.  
Mitigation: backend caps on `page`/`offset` and strict pagination input validation.

## Observability

Track pagination behavior so issues are visible in production-like environments:

1. count page-change events per view
2. track clamp-correction events (requested page vs corrected page)
3. track paginated endpoint latency for first page vs deep pages
4. monitor validation rejects for over-limit pagination requests

## Acceptance Criteria

1. All targeted table routes use a shared pagination component.
2. Users can jump directly to first/last page.
3. Page-number window with ellipsis is visible for large totals.
4. Pagination controls are fully keyboard-accessible and screen-reader labeled.
5. Status text includes page number and current visible result range.
6. Controls expose loading-disabled behavior during in-flight page changes.
7. Existing route search state behavior remains intact.
8. Tests cover helper logic, component behavior, and route integration.
9. Shared backend pagination contract is enforced across all affected endpoints.
10. Basic pagination observability signals are available for operations/debugging.
