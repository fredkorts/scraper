# Product Detail UX Remodel Implementation

## Status

Planned (March 13, 2026).

## Summary

Remodel the Product Detail page around the user’s primary decision signals: current price, stock state, and discount versus original price. Reduce developer-centric noise, introduce clear sparse-data behavior for history, and fix action hierarchy so `Watch product` becomes the dominant CTA.

## Delivery Principles

1. Follow test-first delivery: write failing tests before implementation changes.
2. Reuse existing Product Detail components and utilities wherever possible.
3. Keep components small and focused; split view concerns into logical subcomponents instead of growing monoliths.
4. Keep behavior and route contracts stable unless explicitly changed in this plan.

## UX Objectives

1. Make the page immediately answer: "Is this a good time to buy?"
2. Elevate key actions and key signals above metadata.
3. Remove ambiguous or duplicate information.
4. Handle low-history products with honest, confidence-building empty states.
5. Keep accessibility and keyboard flow intact while improving visual hierarchy.

## Priority Matrix

1. `High`: Price/stock hero hierarchy is weak.
2. `High`: Discount signal is buried.
3. `High`: Chart renders as empty/broken with 1 point.
4. `High`: CTA emphasis is inverted (`Open on Mabrik` > `Watch product`).
5. `Medium`: Redundant stats and prose summary duplication.
6. `Medium`: `History points` label is unclear.
7. `Medium`: Product UUID shown in primary view.
8. `Low`: "Fallback" wording is developer-facing.
9. `Low`: Timestamp row is too dense for new products.

## Scope

Include:

1. Product Detail header and hero overview
2. Product Detail action cluster
3. Price History visual state and controls
4. Product Detail metadata placement/copy

Exclude:

1. Backend/API schema changes
2. Scraper logic and data model changes
3. Route architecture changes outside Product Detail

## Information Architecture Redesign

### 1) Hero Zone (Primary)

Purpose: immediate buying context.

Structure:

1. Current price (largest typographic emphasis)
2. Stock status badge (`In stock` or `Sold out`)
3. Discount badge near price when original price exists and delta > 0
    - Example: `34% below original`
4. Optional microcopy under price for confidence:
    - `Updated just now` or `Updated 2h ago`

Remove from hero cards:

1. Product UUID
2. Raw `History points` label
3. Multi-field timestamp cluster

### 2) Supporting Details Zone (Secondary)

Purpose: supporting context without competing with pricing signal.

Move here:

1. Categories
2. Original price detail
3. First seen / last seen as a concise line
4. Snapshot count (rename from `History points`)

Copy changes:

1. Replace `History points` with `Price snapshots`
2. Replace `Out of stock` with `Sold out` consistently across Product Detail surfaces

### 3) Technical Details Zone (Tertiary)

Purpose: keep advanced identifiers available but out of main flow.

1. Add collapsible `Technical details` section
2. Move Product ID/UUID into this section
3. Keep copy-to-clipboard affordance optional and unobtrusive

## CTA Hierarchy Redesign

1. Promote `Watch product` to primary button style and primary slot.
2. Demote `Open on Mabrik` to secondary/outlined action.
3. Keep both actions grouped near title/hero and visible above fold.
4. Preserve current behavior and routing; this is visual hierarchy and labeling only.

## Price History Experience Redesign

### 1) Sparse Data State Rules

Define explicit rendering modes:

1. `0 points`: empty state (`No price history yet`)
2. `1-2 points`: sparse state (`Not enough history to show trend yet`), show compact summary + table
3. `>=3 points`: full chart state

Sparse state content:

1. Friendly explanation: data is still accumulating
2. Show latest known price and timestamp
3. Show table directly (no developer language)

### 2) Remove Redundant Summaries

1. Keep summary cards (`Latest`, `Min`, `Max`, `Stock transitions`)
2. Remove duplicate prose sentence repeating same values
3. Keep screen-reader summary as `sr-only`, not visible prose

### 3) Rename Toggle Language

1. Replace `Show table fallback` with `Table view`
2. Replace `Show chart view` with `Chart view`
3. If sparse state is active, default to table and disable chart toggle with explanatory tooltip/message

## Visual Design Tokens and Styling

1. Introduce/confirm semantic tokens for:
    - positive price movement (`--price-up-color`: red)
    - negative price movement (`--price-down-color`: green)
    - stock status badges (`in-stock`, `sold-out`)
2. Ensure contrast compliance in light and dark modes.
3. Use clear typographic scale:
    - Hero price: strongest
    - Discount badge: second strongest accent
    - Metadata: subdued text treatment

## Accessibility Requirements

1. Preserve semantic heading order in hero and history sections.
2. Ensure badge/status copy is text-based (not color-only signal).
3. Keep keyboard access for both CTAs and chart/table toggle.
4. Use ARIA labels for sparse-data messaging and technical-details disclosure.
5. Ensure removed visible prose still has equivalent screen-reader context where needed.

## Engineering Implementation Plan

1. Add visual-mode and presentation contracts in the view model layer first:
    - Extend [use-product-detail-page-view-model.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/hooks/use-product-detail-page-view-model.ts) with:
        - `historyVisualMode: "empty" | "sparse" | "chart"`
        - `discountBadgeLabel?: string` (for hero display, derived from existing discount state)
    - Keep discount math in [product-detail-view.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/utils/product-detail-view.ts) and avoid recalculating in JSX.
2. Refactor Product Detail hero into small existing-pattern subcomponents:
    - Keep [product-critical-overview.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/components/detail/product-critical-overview.tsx) as orchestrator only.
    - Add focused children under `components/detail/`:
        - `product-hero-price-block.tsx` (current price, stock badge, discount badge)
        - `product-supporting-details.tsx` (categories, snapshots, concise timestamp line)
        - `product-technical-details.tsx` (collapsible UUID/source section)
    - Use existing `AppButton`, `Tag`, `Statistic`, `Descriptions`, and shared formatters/constants.
    - Update and export prop types for new subcomponents in [product-detail-sections.types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/types/product-detail-sections.types.ts) and any local barrel/index files if needed.
3. Remodel header/hero composition in:
    - [product-detail-header.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/components/detail/product-detail-header.tsx)
    - [product-critical-overview.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/components/detail/product-critical-overview.tsx)
    - [product-detail-view.module.scss](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/components/product-detail-view.module.scss)
4. Implement CTA hierarchy update in header action cluster:
    - `Watch product` becomes primary.
    - `Open on Mabrik` becomes secondary action style.
5. Move UUID to `Technical details` disclosure and remove it from primary card flow.
6. Replace `History points` display text with `Price snapshots` and contextual copy.
7. Add sparse-data state branching in:
    - [product-history-visual-state.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/components/detail/product-history-visual-state.tsx)
    - Render rules must use `historyVisualMode` from view model, not ad-hoc local checks.
    - Keep table visible by default in `sparse` mode.
8. Remove duplicate visible summary prose in:
    - [product-detail-view.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/components/product-detail-view.tsx)
9. Update chart/table toggle labels and behavior in:
    - [product-history-controls-section.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/components/detail/product-history-controls-section.tsx)
    - Rename to `Table view` / `Chart view`.
    - In sparse mode, disable chart toggle with explanatory hint.
10. Keep existing chart and summary card components, but gate display by data-density rules.
11. Ensure accessibility parity:

- Render `historyScreenReaderSummary` in an `sr-only` element (not visible prose).
- Keep text labels for stock/discount signals and action controls.

12. Standardize stock copy source:

- Use [stock.constants.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/shared/constants/stock.constants.ts) everywhere.
- Canonical label: `Sold out` (sentence case) across Product Detail.

## Test and Validation Plan

1. Write failing tests first (required sequence):
    - Update integration tests in [scrape-views.test.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/routes/scrape-views.test.tsx) before component implementation.
    - Add/update component tests under Product Detail component test files for new subcomponents and visual-mode branching.
2. Integration test updates (must fail before implementation):
    - Replace `Show table fallback` assertions with `Table view` / `Chart view`.
    - Assert sparse mode behavior for 1-2 points (table-first, chart disabled or hidden).
    - Assert `Watch product` is primary and `Open on Mabrik` is secondary semantics using stable intent hooks (`data-intent` attribute or an equivalent explicit test contract).
    - Assert Product UUID is absent from default view and present only after expanding technical details.
3. Component behavior tests:
    - Hero renders discount badge when original price delta exists.
    - `Watch product` renders as primary intent.
    - Product ID is not visible until technical details expanded.
4. History state tests:
    - 0 points => empty state
    - 1-2 points => sparse state + table-first
    - > =3 points => chart state
5. Copy and label tests:
    - No `fallback` text in user-facing controls.
    - `Sold out` terminology appears consistently (sentence case).
    - `Price snapshots` replaces `History points`.
6. Accessibility tests:
    - `historyScreenReaderSummary` exists in `sr-only` node.
    - Badge and CTA labels remain discoverable by role/name.
7. Visual regression checks (light and dark):
    - Hero emphasis and CTA prominence
    - Badge contrast and readability
8. Run:
    - `npm run lint --workspace=frontend`
    - `npm run test --workspace=frontend`
    - `npm run build --workspace=frontend`

## Acceptance Criteria

1. Hero area clearly prioritizes current price, stock, and discount.
2. `Watch product` is the primary CTA; `Open on Mabrik` is secondary.
3. Product UUID is removed from main card and placed in technical details disclosure.
4. `History points` is replaced with user-readable `Price snapshots` context.
5. Price history shows explicit sparse-data state when trend data is insufficient.
6. Duplicate summary prose is removed.
7. No user-facing label contains `fallback`.
8. `Sold out` wording is consistent across Product Detail UI (sentence case).
9. Frontend lint, tests, and build pass.

## Risks and Mitigations

1. Risk: aggressive layout changes create regressions across breakpoints.
    - Mitigation: mobile/tablet/desktop visual QA checklist and focused regression tests.
2. Risk: hiding metadata reduces discoverability for power users.
    - Mitigation: technical details disclosure keeps data accessible without polluting primary UI.
3. Risk: sparse-data logic introduces edge-case branching.
    - Mitigation: explicit point-count thresholds with unit tests for each mode.
