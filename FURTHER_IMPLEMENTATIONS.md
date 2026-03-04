# Further Implementations

## Status

Implemented.

Completed outcomes:

- product detail route is lazy-loaded
- `Recharts` no longer inflates the main authenticated route bundle
- product-history controls are URL-backed
- product-history summary cards, chart, and table stay in sync
- product-history control logic has unit-test coverage
- route interaction coverage exists for the control flow

Latest verified frontend build output:

- main app entry chunk: about `39.5 kB`
- lazy product page chunk: about `9.8 kB`
- vendor chunks split into `react-vendor`, `tanstack-vendor`, `chart-vendor`, and `vendor`

## Purpose

This document covers the next two product-history improvements:

1. Code-split the product history route so `Recharts` does not inflate the main authenticated dashboard bundle.
2. Add richer product-history controls so the chart is useful for analysis, not just passive viewing.

The current baseline already exists:

- `frontend/src/routes/product-detail-page.tsx` renders product detail + price history.
- `frontend/src/features/products/queries.ts` loads product detail and history.
- The history chart currently renders every returned point with no user controls.

This plan tightens performance and makes the price-history screen more decision-useful without breaking the existing TanStack Router + TanStack Query + CSS Modules architecture.

## Goals

- Reduce initial dashboard bundle cost by lazy-loading the product history route and chart code.
- Keep route-level data loading behavior consistent with the rest of the app.
- Add controls that map to actual user questions about price movement.
- Preserve accessibility, semantic structure, and URL-driven state.
- Keep the implementation incremental and testable.

## Non-Goals

- No real-time streaming.
- No backend redesign for aggregate analytics.
- No export or CSV feature in this slice.
- No custom charting library; continue with `Recharts`.

## User Needs

These controls should answer the most likely dashboard questions:

- "What happened recently?"
- "Is this product cheaper than it used to be?"
- "Did it go out of stock during the period I care about?"
- "Which category context produced these points?"
- "Can I simplify the chart when I only care about price?"

## Recommended Controls

Implement these controls in this order:

1. `Time range`
   - Options: `30d`, `90d`, `180d`, `all`
   - Why: users need to compress long histories into a readable period quickly.

2. `Category filter`
   - Only show categories that exist in the returned product history for the current product.
   - Why: products can belong to multiple categories, and mixed-category lines can be confusing.

3. `Stock filter`
   - Options: `all`, `in stock only`, `out of stock only`
   - Why: lets users isolate periods relevant to availability changes.

4. `Show original price`
   - Toggle a second line only when historical `originalPrice` data exists.
   - Why: useful for discount context, but should stay optional to avoid clutter.

5. `Show stock overlay`
   - Toggle stock-state markers or a stock-state band/legend on the chart.
   - Why: users often need to correlate price points with stock transitions.

These five controls are enough for a meaningful first analytical version. Anything beyond this should wait until actual usage reveals gaps.

## Why These Controls

This is the smallest useful set because it balances:

- analytical value
- backend simplicity
- frontend state complexity
- chart readability

It deliberately avoids overloading the first version with date pickers, compare modes, or arbitrary metric builders.

## 10 User Stories

1. As a logged-in user, I want the product-history page to load only when I navigate to a product so the rest of the dashboard stays fast.
2. As a logged-in user, I want a default `90d` history view so I can see recent price movement without manual setup.
3. As a user tracking products over a long period, I want to switch between `30d`, `90d`, `180d`, and `all` so I can change chart density quickly.
4. As a user viewing a product that appears in multiple categories, I want to filter by category so I can understand the price timeline in the correct context.
5. As a user focused on availability, I want to filter to `in stock only` or `out of stock only` snapshots so I can isolate meaningful periods.
6. As a user evaluating discount behavior, I want to toggle original-price visibility so I can compare current and crossed-out prices without cluttering the chart by default.
7. As a user watching stock volatility, I want to toggle stock overlays so I can correlate price changes with stock transitions.
8. As a user sharing or bookmarking a view, I want my history controls reflected in the URL so the same analytical state can be reopened directly.
9. As a keyboard-only user, I want all history controls to be standard form controls with labels so the chart state is accessible without pointer-only interactions.
10. As a user when filters remove all matching points, I want a clear empty state that explains why the chart is blank so I know the system is working as intended.

## Frontend Architecture

### Route Splitting

Convert the product route into a lazy route boundary.

Recommended shape:

- Move product route component into a lazily imported module.
- Keep route registration in `frontend/src/app/router.tsx`.
- Load product detail and product history data inside the lazy route loader.
- Keep `Recharts` imports inside the lazy route module so the main dashboard bundle does not pull them in up front.

Implementation direction:

- `frontend/src/routes/product-detail-page.tsx` becomes the lazy-loaded screen module.
- Add a route wrapper or lazy route registration using TanStack Router’s lazy loading pattern.
- Keep the route path stable: `/app/products/$productId`.

### Control State

The control state should be URL-backed, not local-only.

Recommended URL state:

- `range`
- `categoryId`
- `stockFilter`
- `showOriginalPrice`
- `showStockOverlay`

Implementation rule:

- Parse and sanitize with a dedicated helper.
- Use the router search state as the source of truth.
- Derive filtered chart/table data in the frontend from the already fetched product history payload.

This avoids a backend round-trip for every control change and matches the current TanStack Router conventions already used for runs.

### Control Logic Module

Use a dedicated pure helper module for control parsing and data derivation.

Current baseline for this already exists:

- `frontend/src/features/products/history-controls.ts`
- `frontend/src/features/products/history-controls.test.ts`

This module should remain the single place for:

- default control values
- search parsing
- filtered history derivation
- summary metric derivation

### View Composition

Recommended component breakdown:

- `ProductDetailPage`
  - route shell
  - loader/useSearch integration
- `ProductHistoryControls`
  - labeled selects/toggles
  - no data fetching logic
- `ProductHistoryChart`
  - chart rendering only
- `ProductHistorySummary`
  - summary cards derived from filtered data
- `ProductHistoryTable`
  - filtered table view

This keeps the route file from becoming the next monolith.

## Backend Impact

No new backend endpoint is strictly required for the first control pass.

Why:

- the current `/api/products/:id/history` payload already includes `categoryId`, `categoryName`, `price`, `originalPrice`, `inStock`, and `scrapedAt`
- the planned controls can operate on client-side derived data

Possible future backend extension, only if needed later:

- range-limited history queries if product histories become too large to ship in full

Do not add that now unless real payload size becomes a measured problem.

## Accessibility Rules

- Every control must have a visible `<label>`.
- The chart must not be the only representation of historical data.
- Keep the history table visible and filtered by the same control state.
- Empty/filter-empty states must explain what happened.
- Toggle states must be announced clearly and not rely on color alone.
- Focus should remain stable when controls change; do not move focus on ordinary filter changes.

## Styling Rules

- Continue using route-level `*.module.scss`.
- Reuse existing tokens and surface/card patterns from `scrape-views.module.scss`.
- Keep controls grouped in a compact toolbar above the chart.
- Avoid visually noisy chart chrome; prioritize readability over decoration.

## Implementation Phases

### Phase A: Route Code Splitting

- Convert `/app/products/$productId` into a lazy route module.
- Confirm `Recharts` moves out of the main bundle.
- Rebuild and inspect chunk output.

Acceptance criteria:

- Main authenticated bundle no longer includes the product chart path.
- Product route still passes current build and route tests.

### Phase B: URL-Backed Control State

- Add validated product-history search state.
- Wire defaults on first load.
- Connect search state to controls.

Acceptance criteria:

- Refreshing the page preserves control state.
- Back/forward navigation restores history control state.

### Phase C: Filtered Derivations

- Filter chart/table data using the helper module.
- Add summary cards for filtered view:
  - point count
  - latest price
  - min price
  - max price
  - stock transitions

Acceptance criteria:

- All visible summaries, chart points, and table rows stay in sync.

### Phase D: Chart Overlays

- Add original-price line toggle.
- Add stock overlay toggle.
- Keep chart legend and tooltip readable.

Acceptance criteria:

- Original-price line only renders when enabled and data exists.
- Stock overlay can be enabled/disabled without affecting underlying filtered table data.

## Unit Tests For Product-History Controls

These tests should exist before the UI rollout depends on them.

Already added:

- `frontend/src/features/products/history-controls.test.ts`

Current coverage:

- parses valid URL-like control state
- falls back to defaults for invalid values
- filters history by time range
- filters by category and stock state together
- summarizes latest/min/max price and stock transitions
- handles empty history safely

Additional unit tests to add during UI implementation:

1. control component emits router updates when range changes
2. category filter only shows categories present in the current product history
3. original-price toggle disables itself when no `originalPrice` values exist
4. stock overlay toggle affects chart rendering state but not table row filtering
5. empty filtered result renders a clear empty state message

## Integration / Route Tests

Add or extend route tests to cover:

- lazy-loaded product route still renders correctly
- bookmarked URL with control params restores the same filtered state
- history table and summary cards update together when controls change
- keyboard users can tab through all controls in a sensible order

## Risks

1. Large product histories may still produce heavy client-side filtering work.
   - Mitigation: keep client-side for now, measure later, add backend range limiting only if needed.

2. Chart clutter can degrade usability quickly.
   - Mitigation: default to a single current-price line and keep overlays opt-in.

3. Route-splitting can regress prefetch behavior if done carelessly.
   - Mitigation: keep loader contracts unchanged and verify route navigation tests.

## Recommended Execution Order

1. Implement lazy product route registration.
2. Add product-history search parsing and defaults.
3. Build `ProductHistoryControls` UI.
4. Connect filtered derivations to chart, summary cards, and table.
5. Add original-price line and stock overlay toggles.
6. Extend route tests for control-driven behavior.

## Deliverables

- lazy-loaded product-history route
- URL-backed product-history controls
- filtered summary cards
- optional original-price line
- optional stock overlay
- unit tests for control logic
- route tests for control behavior

All deliverables above are now implemented.
