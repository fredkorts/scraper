# Table Row Click Navigation Implementation

## Status

Planned (March 12, 2026).

## Summary

Remove table action columns named `Run` and `Link` across relevant views, remove the redundant `Dashboard` column in Run Detail product snapshots, and introduce clickable table rows that navigate to Product Detail when a product target exists. Add clear hover background and pointer cursor behavior in both light and dark themes.

## System Architect Audit Findings

1. `High`: Shared-table change blast radius is broad.
    - Resolution: keep row-click behavior fully opt-in via `DataTable` props so unaffected tables remain unchanged.
2. `High`: Row click can conflict with links/buttons inside cells.
    - Resolution: suppress row navigation when click originates from interactive descendants and keep existing product links for keyboard/screen-reader flow.
3. `Medium`: Theme hover token is not standardized for table rows.
    - Resolution: add explicit `--table-row-hover-bg` token in both themes and use it only for clickable rows.
4. `Medium`: Removing columns can regress integration tests and user expectations.
    - Resolution: update route tests to assert row-click navigation outcomes instead of action-link presence.
5. `Low`: Product History rows have no meaningful product-detail destination.
    - Resolution: remove `Run` column there and keep rows non-clickable.

## Scope

Include:

1. Changes Explorer table
2. Run Detail `Diff Items` table
3. Run Detail `Product Snapshots` table
4. Product Detail `History Table` (remove `Run` column only)

Exclude:

1. Runs list table
2. Dashboard panels
3. Settings/admin scheduler tables
4. Backend/API contracts

## Public API and Type Changes

1. [data-table.types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/components/data-table/types/data-table.types.ts)
    - Add `onRowClick?: (row: TData) => void`
    - Add `isRowClickable?: (row: TData) => boolean`
2. [changes-table-section.types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/types/changes-table-section.types.ts)
    - Add optional row-click passthrough props for generic table sections
3. [run-detail-sections.types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/types/run-detail-sections.types.ts)
    - Add row-click props for run changes/products sections
4. [use-run-detail-columns.types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/types/use-run-detail-columns.types.ts)
    - Remove `productLinkClassName`
5. [use-changes-list-columns.types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/types/use-changes-list-columns.types.ts)
    - Remove `productLinkClassName`

## Implementation Plan

1. Update `DataTable` behavior:
    - Implement opt-in row click handling in [DataTable.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/components/data-table/DataTable.tsx)
    - Apply clickable-row class only when row is clickable
    - Ignore row navigation for events from interactive elements (`a`, `button`, `input`, `select`, `textarea`, elements with interactive ARIA roles)
2. Add clickable-row styles:
    - Extend [DataTable.module.scss](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/components/data-table/DataTable.module.scss) with hover background + `cursor: pointer`
    - Ensure style is not applied to non-clickable tables
3. Add theme token:
    - Add `--table-row-hover-bg` to light and dark theme sets in [variables.scss](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/styles/abstracts/_variables.scss)
4. Remove action columns:
    - In [use-run-detail-columns.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/hooks/use-run-detail-columns.tsx): remove `Dashboard` and `Link` columns
    - In [use-changes-list-columns.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/hooks/use-changes-list-columns.tsx): remove `Run` and `Link` columns
    - In [use-product-history-columns.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/products/hooks/use-product-history-columns.tsx): remove `Run` column
5. Wire row navigation:
    - In [RunDetailPageView.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/views/run-detail-page/RunDetailPageView.tsx), pass row-click handlers for both run-detail tables to `/app/products/$productId` with `defaultProductHistoryControls`
    - In [ChangesPageView.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/views/changes-page/ChangesPageView.tsx), pass row-click handler to `/app/products/$productId` with `defaultProductHistoryControls`
    - Keep Product History table rows static
6. Thread props through section components:
    - [run-changes-section.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/components/detail/run-changes-section.tsx)
    - [run-products-section.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/components/detail/run-products-section.tsx)
    - [changes-table-section.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/components/shared/changes-table-section.tsx)

## Test Cases and Scenarios

1. `DataTable` unit tests in [DataTable.test.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/components/data-table/DataTable.test.tsx):
    - Click on non-interactive cell triggers `onRowClick`
    - Click on interactive child does not trigger `onRowClick`
    - Clickable row class appears only when row is clickable
2. Route integration tests in [scrape-views.test.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/routes/scrape-views.test.tsx):
    - Remove assertions expecting `Run`/`Link`/`Open product` action links in affected tables
    - Add assertions that clicking rows in Changes Explorer and Run Detail tables navigates to Product Detail
    - Add assertion that Product History fallback table no longer contains `Run` column
3. Accessibility smoke:
    - Existing inline product links remain present and discoverable by role
    - No nested interactive regressions

## Acceptance Criteria

1. No `Run`/`Link` columns remain in scoped tables.
2. No `Dashboard` column remains in Run Detail product snapshots.
3. Rows in Changes Explorer and Run Detail tables show hover background and pointer cursor.
4. Clicking those rows opens Product Detail when a row has a product target.
5. Product History table has no `Run` column and rows are non-clickable.
6. Lint, tests, and build pass for frontend.

## Verification Commands

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`

## Risks and Mitigations

1. Risk: accidental navigation on link/button click.
    - Mitigation: interactive-descendant guard in `DataTable` row click handler.
2. Risk: visual regressions on non-clickable tables.
    - Mitigation: clickable styles gated behind explicit props.
3. Risk: brittle route tests after UX change.
    - Mitigation: switch assertions from action-link presence to row navigation behavior.

## Assumptions and Defaults

1. Scope is all relevant tables listed above.
2. Row accessibility model is pointer row-click plus existing inline links for keyboard/screen-reader usage.
3. Product History rows stay non-clickable by design.
4. No backend or schema changes are required.
