# Product Detail Ant Design Implementation Plan

## Summary

Redesign the protected product detail page (`/app/products/$productId`) with Ant Design components while preserving the current TanStack Router + TanStack Query + Recharts data flow.

Primary UX goal:

- make **Price** and **Stock** the most visually prominent information above the fold
- keep the existing Price History section largely intact
- improve history readability and decision-support without changing backend contracts

## UX Objectives

1. A user should understand current price and stock status within 3 seconds.
2. Critical product state (price, stock, discount context, last seen) should be scannable on mobile and desktop.
3. Price History controls should remain powerful but feel cleaner and easier to use.
4. Users should understand whether data is fresh and where it came from (tracked category context + run context).
5. Empty/error/loading states should be explicit and actionable.

## UX Hierarchy Contract

This contract is mandatory for implementation consistency:

1. First viewport must show:
   - Current Price
   - Stock state
   - Product name
2. Visual weight order:
   - Price (`Statistic` value, largest emphasis)
   - Stock (`Tag/Badge` + explicit text)
   - Original price + discount delta
   - Secondary metadata
3. Desktop layout rule:
   - Price and Stock must appear in the first metric row.
4. Mobile layout rule:
   - Price card first, Stock card second, before image/extended metadata.
5. Status semantics:
   - `In stock` and `Out of stock` must always be textual, not icon/color only.
6. Measurable prominence rule:
   - current price uses primary metric styling (`Statistic` with largest size in the hero metrics block)
   - stock uses emphasized semantic tag adjacent to primary metrics
   - secondary metrics (history points/original price) must use lower visual emphasis than current price

## Non-Goals

1. No backend API redesign.
2. No replacement of Recharts in this phase.
3. No billing/plan logic changes.
4. No migration of unrelated views to Ant Design.

## Target Information Architecture

## Section A: Header / Context

- product name
- breadcrumb/back navigation
- external link to Mabrik
- freshness metadata (`Last seen`, `First seen`)

Ant components:

- `Breadcrumb`
- `Typography.Title` + `Typography.Text`
- `Button` (external link)
- `Tag` for key context chips

## Section B: Critical State (Above the fold)

This is the highest-priority area.

- **Current Price** (largest visual weight)
- **Stock State** (high contrast semantic state)
- **Original Price / discount delta**
- **History point count**

Ant components:

- `Card`
- `Statistic`
- `Tag` / `Badge`
- `Space` / `Flex`

UX rule:

- current price and stock must be first row on desktop and first visible block on mobile

## Section C: Product Metadata

- product image
- category chips
- product metadata summary

Ant components:

- `Image`
- `Descriptions`
- `Tag`
- `Card`

## Section D: Price History (keep mostly intact)

Keep existing logic:

- URL-backed controls (`range`, `categoryId`, `stockFilter`, `showOriginalPrice`, `showStockOverlay`)
- synchronized summary cards + chart + table
- Recharts rendering + lazy-loaded route behavior

Ant components around existing chart:

- `Card` wrapper
- `Form`/`Space` layout for controls
- `Select` for filters
- `Switch` for toggles
- `Statistic` for filtered summary metrics
- `Alert`/`Empty` for no-data/error messaging

## Recommended History Improvements (incremental)

## P1 (required in this implementation)

1. Add quick range shortcuts using Ant segmented controls (`30d`, `90d`, `180d`, `All`) for faster scanning.
2. Improve tooltip content hierarchy:
   - date/time first
   - current price
   - original price (if present)
   - stock state
3. Add clearer empty-state guidance when filters exclude all points.
4. Keep chart legend minimal and move explanatory copy to a compact `Alert`/note block.

## P2 (optional follow-up, do not block release)

1. Add a compact “trend summary” row:
   - latest vs previous snapshot delta
   - min/max in selected range
   - stock transitions count

Scope rule:

1. If P1 is complete and tests pass, this phase can close without P2.

## Original Price Fallback Rules

1. If `originalPrice` is missing, show `Original price: —` and suppress discount-delta copy.
2. If `originalPrice` exists and is greater than current price, show discount delta.
3. If `originalPrice` exists but is not greater than current price, show original price value only (no discount claim).
4. History toggle `Show original price` remains disabled when no original-price history exists.

## Section E: Recent Runs

- preserve existing recent run visibility
- show run status and quick link to run detail

Ant components:

- `List` or `Table` (small)
- `Tag` for status
- `Button`/`Link` for drill-down

## UX User Stories

1. As a user, I can instantly see whether the product is currently in stock.
2. As a user, I can instantly see the current price without scanning dense metadata.
3. As a user, I can compare current and original prices to understand discount context.
4. As a user, I can quickly change history range without losing page context.
5. As a user, I can filter history to one category when products appear in multiple categories.
6. As a user, I can isolate in-stock or out-of-stock periods to understand availability behavior.
7. As a user, when filters produce no results, I get clear guidance on what to change.
8. As a user, I can open the product on Mabrik quickly from the detail page.
9. As a user, I can review recent runs related to this product and jump to run detail.
10. As a keyboard-only user, all controls are operable with clear labels and focus states.

## Edge Cases

1. `originalPrice` missing across all points.
2. History payload exists but filtered result is empty.
3. Product has no recent runs.
4. Product image URL broken.
5. Product is out of stock but has price updates.
6. Product belongs to many categories (chip overflow).
7. Long product names and category names on small screens.
8. Backend returns stale/partial data after recent scrape.
9. Chart has very dense points in `all` range.
10. Route param points to missing/deleted product.

## Recovery Action Matrix

Each state must include a user-visible next step:

1. Product detail load failure:
   - show `Alert` with `Retry` action
   - secondary action: `Back to runs`
2. History fetch failure:
   - show `Alert` with `Retry history` action
   - keep existing product summary visible
3. Filtered history empty:
   - show `Empty` with action: `Reset filters`
4. Missing product (404):
   - show explicit not-found message with `Back to runs`
5. Broken image:
   - use fallback placeholder image and keep page functional
6. No recent runs:
   - show informative empty state with link to runs list

## Accessibility Requirements

1. Keep semantic heading structure (`h1`, `h2` sections).
2. Ensure status is not color-only; include explicit text (`In stock`, `Out of stock`).
3. Provide visible labels for all filters and toggles.
4. Ensure chart is not the only representation of historical data (table remains).
5. Keep keyboard focus order predictable across cards, controls, and links.
6. Ensure touch target size for filters and action buttons is mobile-appropriate.
7. Provide a concise screen-reader history summary above the chart:
   - point count
   - latest price
   - min/max in selected range
8. Ensure switches/selects have programmatic labels and descriptive helper text where needed.

## Freshness and Data Source UX Rules

1. Show absolute timestamp for `Last seen` and `First seen`.
2. Add relative freshness text near last seen, for example:
   - `Updated 12 minutes ago`
3. Add stale-data warning state:
   - when `Last seen` exceeds configured threshold
   - show warning `Alert` with neutral guidance (no alarmist copy)
4. Show source context:
   - categories shown as chips
   - recent runs section links to originating run details

Implementation rule:

1. Define threshold constant in frontend (single source of truth), e.g. `PRODUCT_STALE_THRESHOLD_HOURS = 48`.
2. Use that same constant in stale-state UI logic and route/component tests.

## Component Mapping (Current -> Ant)

1. ad-hoc metric cards -> `Card` + `Statistic`
2. stock badge span -> `Tag`/`Badge` with explicit text
3. native select blocks -> `Select` (preserve URL state behavior)
4. checkbox toggles -> `Switch` with labels
5. empty/error text panels -> `Empty` / `Alert`
6. metadata card rows -> `Descriptions`
7. recent runs panel list -> Ant `List` (fixed decision for this page)

## React Architecture Contract

Use a strict container/presentational split:

1. `routes/product-detail-page.tsx`:
   - route composition only
   - query/search wiring only
   - passes prepared props into UI sections
2. `features/products/hooks/*`:
   - derived view-model logic only
   - no JSX layout rendering
3. `features/products/components/*`:
   - presentational rendering only
   - receives precomputed props
   - no direct query/search parsing

Rule:

1. Presentational components must not own route/search/query logic.

## Navigation Contract

1. Internal navigation uses TanStack `Link` only.
2. External Mabrik link uses native anchor (`<a target="_blank" rel="noreferrer">`).
3. Ant `Button` may wrap styling/interaction but is not the routing owner for internal route changes.

## Implementation Phases

## Phase 1: Design Foundation

1. Create route-local design structure for product detail view sections.
2. Add Ant layout primitives (`Card`, `Space`, `Flex`) around existing content.
3. Promote Price + Stock cards into primary hero area.

## Phase 2: Controls and History Container

1. Replace history control wrappers with Ant form controls.
2. Keep existing URL state + parsing + filtering logic unchanged.
3. Keep Recharts logic unchanged; update surrounding card/summary presentation.

## Phase 3: Metadata and Recent Runs

1. Convert metadata block to `Descriptions` + tags.
2. Convert recent runs panel to structured Ant `List` with clear status tags.

## Phase 4: UX Polish

1. Improve chart tooltip formatting and empty-state guidance.
2. Validate responsive behavior at common breakpoints.

Optional follow-up phase (P2 only):

1. Add trend summary row above chart.

## Testing Plan

## Unit tests

1. existing history control logic tests stay green.
2. add formatter tests for trend summary values (if extracted helper added).

## Integration / route tests

1. product detail renders price and stock before extended metadata in DOM order.
2. history controls still update URL-backed state.
3. summary cards/chart/table remain synchronized after control changes.
4. empty and error states render expected guidance.
5. recent runs section renders and links correctly.
6. stale-data warning appears when last seen exceeds threshold.
7. reset-filters action restores default history search state.
8. original-price fallback behavior matches rules (`—`, no discount claim, toggle disable when unavailable).
9. price metric renders with higher-emphasis styling hook/class than secondary metrics.
10. browser back/forward restores URL-backed history controls (`range`, `categoryId`, `stockFilter`, toggles).

## Accessibility checks

1. keyboard navigation through all history controls.
2. labels and roles for switches/selects/actions.
3. status text visible and not color-only.

## Acceptance Criteria

1. Product detail page uses Ant Design components for core layout and information hierarchy.
2. Price and stock are the most prominent elements above the fold.
3. Existing product-history behavior (URL state + synchronization + chart) remains intact.
4. History readability improvements are implemented without backend changes.
5. Loading, empty, and error states are clearer than current version.
6. Recovery actions are present for load failure, empty history, and not-found scenarios.
7. Freshness text (absolute + relative) and stale warning behavior are implemented.
8. P1 history improvements are complete; P2 remains optional.
9. Route tests and full frontend test/build pass after implementation.

## Risks and Mitigations

1. Risk: Visual inconsistency between Ant components and existing CSS modules.  
   Mitigation: keep Ant usage route-scoped first; use existing design tokens where possible.

2. Risk: Regressions in history filters while changing control components.  
   Mitigation: keep control state contract unchanged; rely on existing history-control tests.

3. Risk: Over-designing chart area and reducing clarity.  
   Mitigation: preserve current chart logic; add only minimal high-value enhancements.

4. Risk: Bundle growth from additional Ant usage.  
   Mitigation: keep scope limited to product detail route and already lazy-loaded screen.
