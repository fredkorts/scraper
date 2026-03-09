# UX_AUDIT.md

## Status

Implemented (core remediation complete, smoke accessibility coverage active).

## Locked Implementation Decisions

1. App shell owns the only authenticated `main` landmark.
2. Route pages under authenticated shell must use `section`/`article` only, never nested `main`.
3. Nested interactive fixes use this rule:
    1. Internal navigation uses `Link` styled as button-like control when needed.
    2. External navigation uses semantic `<a>` styled with button class.
    3. Do not wrap `AppButton` inside `Link` or `<a>`.
4. Header dropdown menu rows are single interactive targets only:
    1. Use Ant menu item `label` text + `onClick` command for actions and navigation.
    2. Do not nest router `Link` inside menu item label.
5. Form error semantics are implemented through a shared helper contract, not ad hoc per-form wiring.
6. Data-table action copy rule:
    1. Use descriptive visible text for text links/buttons.
    2. Use contextual `aria-label` only for icon-only controls.

## Scope

Frontend UX audit focused on:

1. Accessibility (A11y)
2. Semantic correctness
3. Keyboard/tab navigation and interactive labeling

Audited areas include:

1. Public routes (`landing`, `login`, `register`, `forgot/reset password`, `verify email`, `403/404`, global errors)
2. Authenticated app routes (`dashboard`, `runs`, `changes`, `run detail`, `product detail`, `settings`)
3. Shared interaction primitives (`AppButton`, `AppInput`, `AppSelect`, `CategoryTreeSelect`, `DataTable`, `PaginationControls`, header menu)

## Executive Summary

The frontend is mostly keyboard-usable and generally label-aware. Core issues remain in semantic structure and assistive technology support:

1. Missing app-shell `main` landmark in authenticated layout
2. Multiple nested interactive element patterns (`button` inside `a`/`Link`)
3. Form errors not programmatically tied to inputs
4. Repeated generic action link labels in data tables
5. Header menu item composition can be simplified to avoid mixed semantics
6. Chart view lacks a strong text equivalent for non-visual users

## Findings By Severity

## Critical

1. Missing app-shell `main` landmark
    1. File: `frontend/src/routes/app-layout.tsx`
    2. Impact: Landmark navigation is weaker for screen readers.
    3. Recommendation: Wrap `Outlet` region in a `main` element with stable id/label.

2. Nested interactive elements
    1. Files:
        1. `frontend/src/routes/product-detail-page.tsx`
        2. `frontend/src/features/products/components/detail/product-recent-runs.tsx`
        3. `frontend/src/features/products/components/detail/product-critical-overview.tsx`
    2. Impact: Invalid semantics and confusing focus/activation behavior.
    3. Recommendation: Use one interactive element only, following locked rule:
        1. Internal navigation: `Link` styled as button-like control
        2. External navigation: semantic `<a>` styled with button class

## High

1. Form errors not associated with controls
    1. Files:
        1. `frontend/src/features/auth/login-form.tsx`
        2. `frontend/src/features/auth/register-form.tsx`
        3. `frontend/src/routes/forgot-password-page.tsx`
        4. `frontend/src/routes/reset-password-page.tsx`
    2. Impact: Assistive tech users may not hear which field failed.
    3. Recommendation: Add `aria-invalid`, `aria-describedby`, unique error ids, and field-level `role="alert"`/live announcement where needed.

2. Generic table/link action labels
    1. Files:
        1. `frontend/src/features/runs/hooks/use-runs-table-columns.tsx`
        2. `frontend/src/features/runs/hooks/use-changes-list-columns.tsx`
        3. `frontend/src/features/runs/hooks/use-run-detail-columns.tsx`
        4. `frontend/src/features/products/hooks/use-product-history-columns.tsx`
    2. Impact: Screen reader links list contains many indistinguishable labels.
    3. Recommendation: Add contextual labels, for example `aria-label="Open run detail for <category> at <time>"`.

## Medium

1. Header menu item semantics can be tightened
    1. File: `frontend/src/components/app-header-menu/AppHeaderMenu.tsx`
    2. Impact: Mixed menu/link composition can be inconsistent across AT/browser combos.
    3. Recommendation: Keep each row as one semantic action target and ensure predictable keyboard behavior.

2. Product chart lacks robust non-visual alternative
    1. File: `frontend/src/features/products/components/detail/product-history-chart.tsx`
    2. Impact: Trend meaning can be lost for non-visual users.
    3. Recommendation: Add text summary and optional table fallback toggle near chart.

## Per-View Assessment

## Public Views

1. `landing-page.tsx`: Semantics good (`main`, `h1`, clear links)
2. `login-page.tsx`: Structure good, form error association needs upgrade
3. `register-page.tsx`: Structure good, form error association needs upgrade
4. `forgot-password-page.tsx`: Structure good, field error semantics need upgrade
5. `reset-password-page.tsx`: Structure good, field error semantics need upgrade
6. `verify-email-page.tsx`: Baseline semantics good
7. `not-found-page.tsx`, `forbidden-page.tsx`, `global-error-page.tsx`, `auth-configuration-error-page.tsx`: Good baseline semantics

## Authenticated Views

1. `app-layout.tsx`: Header/menu is keyboard-usable; main landmark missing
2. `dashboard-home-page.tsx`: Good label coverage for category filter and links
3. `runs-page.tsx`: Good filter labeling and sortable controls
4. `changes-page.tsx`: Good filter labeling and reset action clarity
5. `run-detail-page.tsx`: Good sectioning; repeated generic link text in tables
6. `product-detail-page.tsx`: Main issue area due to nested interactive patterns
7. `settings-page.tsx` and settings tabs: Generally good role/tabpanel/tab semantics

## Remediation Plan

## Phase 1 (Critical semantics)

1. Add authenticated app `main` landmark in `AppLayout`.
2. Remove all nested interactive element patterns in product detail flows.
3. Refactor header menu to single-target menu item semantics (no nested links).

## Phase 2 (Form and table accessibility)

1. Introduce shared form a11y contract:
    1. Add helper utilities/constants for field ids and error ids.
    2. Require `aria-invalid`, `aria-describedby`, and stable error id when field has validation error.
    3. Require error region semantics (`role="alert"` for immediate feedback where appropriate).
2. Standardize auth forms (`login`, `register`, `forgot-password`, `reset-password`) on shared contract.
3. Improve table/action naming:
    1. Replace generic visible labels such as `Open run` with contextual text where layout permits.
    2. For icon-only actions, enforce contextual `aria-label` with row identity.

## Phase 3 (Structural consistency)

1. Add non-visual chart equivalent for product history:
    1. Add a compact textual summary (range, min, max, latest, stock transitions).
    2. Add an explicit "Show table fallback" toggle near chart.
    3. Ensure fallback table is keyboard reachable and announced.
2. Ensure all route-level interactive controls have explicit accessible names.

## Implementation Worklist (File-Level)

1. Landmark and structure:
    1. `frontend/src/routes/app-layout.tsx`
2. Nested interactive fixes:
    1. `frontend/src/routes/product-detail-page.tsx`
    2. `frontend/src/features/products/components/detail/product-recent-runs.tsx`
    3. `frontend/src/features/products/components/detail/product-critical-overview.tsx`
3. Header menu semantics:
    1. `frontend/src/components/app-header-menu/AppHeaderMenu.tsx`
4. Shared form a11y contract:
    1. `frontend/src/features/auth/*` (implementation usage)
    2. Add helper at `frontend/src/shared/forms/a11y.ts`
5. Action label improvements:
    1. `frontend/src/features/runs/hooks/use-runs-table-columns.tsx`
    2. `frontend/src/features/runs/hooks/use-changes-list-columns.tsx`
    3. `frontend/src/features/runs/hooks/use-run-detail-columns.tsx`
    4. `frontend/src/features/products/hooks/use-product-history-columns.tsx`
6. Chart fallback:
    1. `frontend/src/features/products/components/detail/product-history-chart.tsx`
    2. `frontend/src/features/products/components/detail/product-history-visual-state.tsx`

## Validation Checklist

1. Keyboard-only pass:
    1. User can tab through all interactive elements in logical order.
    2. Visible focus ring appears on all controls.
2. Screen reader pass:
    1. Main/content landmarks are announced.
    2. Form fields announce errors and associated messages.
    3. Repeated links are uniquely identifiable by label.
3. Semantics pass:
    1. No nested interactive elements.
    2. Menu actions are single-target and consistently announced.
4. Landmark pass:
    1. Exactly one authenticated `main` landmark exists.
    2. No child route renders additional `main`.

## Suggested Test Additions

1. Auth form tests:
    1. Assert `aria-invalid` and `aria-describedby` on failed validation.
    2. Assert field-level error node id is referenced by input.
2. Layout tests:
    1. Assert presence of single app-level `main` landmark.
    2. Assert no nested route-level `main` in authenticated views.
3. Table/action tests:
    1. Assert contextual labels for repeated action links.
4. Product detail tests:
    1. Assert no `a > button` or `button > a` in render tree.
5. Header menu tests:
    1. Assert settings navigation is invoked via menu click without nested link node.
    2. Assert keyboard open/close and action activation behavior.
6. Automated a11y tests:
    1. Add route-level accessibility smoke tests for login, authenticated shell, and product detail nested-interactive regression.
    2. Optional follow-up: expand to `jest-axe` checks for login, dashboard home, settings admin, and product detail.

## CI Verification Commands

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`
4. `npm run test:a11y --workspace=frontend` (new command to be added with this effort)
    1. Script implementation: Vitest project entry under `frontend/src/test/a11y/` and `package.json` script key `test:a11y`.
    2. Current implementation uses existing Vitest + Testing Library stack without new dependencies.

## Acceptance Criteria

1. Authenticated shell exposes clear header + main landmark structure.
2. No nested interactive elements remain in frontend route/component tree.
3. All auth form validation errors are programmatically associated with inputs.
4. Repeated data-table actions have contextual accessible labels.
5. Header menu contains no nested interactive composition and passes keyboard interaction tests.
6. Product history chart has an accessible text summary and table fallback path.
7. Route-level accessibility smoke checks pass for defined critical pages.
8. Keyboard and screen reader audit pass without critical findings.
    1. Operationalized as:
        1. All checklist items in `Validation Checklist` are marked pass in PR notes.
        2. Automated tests in `Suggested Test Additions` pass in CI.

## Definition of Done

1. All file-level tasks listed in this document are implemented.
2. Test additions in this document are implemented and passing in CI.
3. No regressions in existing routing/search-param behavior.
4. Document status is updated to `Implemented` once all acceptance criteria pass.
