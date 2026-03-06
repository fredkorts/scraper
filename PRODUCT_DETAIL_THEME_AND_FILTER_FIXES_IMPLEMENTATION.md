# Product Detail Theme And Filter Fixes Implementation

## Status

Implemented on March 6, 2026.

## Summary

This plan addresses two concrete regressions introduced by the Product Detail Ant migration:

1. **Theme mismatch**: header/context region and Ant components are visually inconsistent (mixed dark/light appearance).
2. **Filter crowding**: Price History controls are packed too tightly and collide visually on common viewport sizes.

The goal is to bring Product Detail back to a coherent visual system while preserving current behavior (URL-backed controls, chart/table sync, and existing API contracts).

## Problem Statements

## 1) Theme mismatch

Symptoms:

- dark/black-looking top context area while cards/controls render in light surfaces
- typography and component surfaces no longer feel like one theme

Likely root cause:

- app tokens are driven by CSS variables (`--color-*`) with `prefers-color-scheme`
- Ant components are still using default theme tokens and not fully mapped to app tokens
- result is two parallel theme systems rendering side-by-side

## 2) History filter crowding

Symptoms:

- controls push into each other
- segmented range + selects + toggles + reset button compete for width
- poor scanability and poor touch ergonomics on medium/small widths

Likely root cause:

- flat `Flex wrap` layout with mixed-width controls
- no grouped hierarchy for primary vs secondary controls
- no breakpoint-specific structure

## UX Decisions

1. Product Detail must use a **single visual theme system** derived from existing app CSS tokens.
2. Price History controls will be organized into **structured rows**:
   - row A: range control (primary)
   - row B: category + stock select
   - row C: toggles + reset action
3. On mobile, controls stack full-width with clean vertical spacing.
4. Keep behavior intact: only visual/layout and theming consistency changes.

## Technical Approach

## 0) Non-Ant surface audit (root-cause first)

Before token/provider changes, run a CSS-surface audit focused on app-owned layers (not Ant internals) to find the true source of mixed dark/light rendering.

Audit scope:

1. App shell and route wrappers:
   - `body`, `#root`, app layout containers, route page wrappers
   - background, text color, border, and elevation variables in light/dark
2. Product Detail non-Ant containers:
   - breadcrumb/header/context wrappers
   - page-level panels/sections defined in CSS Modules
3. Shared style primitives:
   - global tokens and any fallback hardcoded values
   - surfaces that can override theme unintentionally
4. Cross-route sanity check (same classes/patterns):
   - dashboard home
   - runs list/detail
   - settings

Audit output (required in implementation notes/PR):

- `surface/layer` -> `source file` -> `token/value currently used` -> `expected token/value` -> `action`
- Explicitly mark root-cause items as:
  - app-surface mismatch
  - token mismatch
  - Ant token mismatch

## A) Theme unification for Ant components

Add Ant token mapping via `ConfigProvider` so Ant honors current CSS-variable palette.

Rollout strategy (to reduce blast radius):

1. **Phase A (route-scoped first):**
   - add a Product Detail scoped provider (`ProductDetailThemeScope`) that maps Ant tokens from existing CSS vars
   - apply only on Product Detail route while validating behavior
2. **Phase B (optional global rollout):**
   - promote to app-level provider only after smoke validation on dashboard, runs, settings, and auth pages
   - keep token map minimal and additive

Implementation direction:

1. Execute the non-Ant surface audit and fix app-surface mismatches first.
2. Add `frontend/src/app/theme-provider.tsx` (or route-scoped equivalent in Phase A):
   - wraps app with `ConfigProvider`
   - sets Ant tokens using CSS variables:
     - `colorBgBase`, `colorBgContainer`, `colorText`, `colorTextSecondary`, `colorBorder`, `colorPrimary`
   - set component-level token overrides for frequently used components:
     - `Card`, `Typography`, `Select`, `Segmented`, `Switch`, `Tag`, `Alert`, `Button`
3. If promoting globally, wrap root in `main.tsx`:
   - `QueryClientProvider -> AppThemeProvider -> AppNotificationProvider -> RouterProvider`
4. Verify dark-mode behavior:
   - Ant surfaces and text respond consistently when system preference switches.

## B) Product detail filter layout redesign

Refactor history controls into grouped, responsive layout.

Implementation direction in product detail view:

1. Replace single wrapped flex row with a structured container:
   - `Form layout="vertical"` + `Row/Col` for predictable spacing
2. Row A (primary):
   - Time range segmented (full row)
3. Row B (secondary filters):
   - Category select and Stock filter select side-by-side on desktop/tablet
   - full-width stacked on mobile
4. Row C (display toggles + action):
   - left cluster: original price + stock overlay toggles
   - right cluster: reset filters button
5. Add consistent spacing and min/max width constraints in route-local module SCSS.

## C) Minor cleanup while touching this area

1. Replace deprecated Ant usages still present, with explicit mapping:
   - record exact warning from test/build output
   - map each warning to:
     - current API usage
     - target API usage
     - file changed
   - keep scope limited to Product Detail and directly related shared UI code touched by this fix
2. Keep run list section behavior unchanged (only visual cleanup if needed).

Deprecation cleanup checklist format:

- `warning message` -> `replacement` -> `file`

## Files Expected To Change

1. `frontend/src/main.tsx` (only if Phase B global rollout is executed)
2. `frontend/src/app/theme-provider.tsx` (new, if shared provider path is used)
3. `frontend/src/features/products/components/product-detail-view.tsx`
4. `frontend/src/features/products/components/product-detail-view.module.scss`
5. optionally `frontend/src/styles/abstracts/_variables.scss` (only if token additions are needed)
6. `frontend/src/test/router-utils.tsx` (ensure Ant runtime dependencies remain stubbed in tests)
7. `frontend/src/routes/scrape-views.test.tsx` (selector/query updates for Ant control structure)
8. app shell / layout CSS modules that define non-Ant surfaces (as identified by audit)

## Testing Plan

## Visual/UX checks

1. Product Detail header/context and cards share one coherent theme in both light and dark modes.
2. Filters no longer crowd:
   - desktop: clear row hierarchy and spacing
   - tablet/mobile: no overlap, no cramped controls, touch-friendly targets
3. Price History controls remain understandable at a glance.
4. Cross-route spot check confirms no app-surface theme mismatch on dashboard/runs/settings.

## Functional regression checks

1. Range/category/stock/toggle controls still update URL search state.
2. Reset filters still restores defaults.
3. Chart/table/summary remain synchronized.

## Automated checks

1. Ensure test environment supports Ant runtime dependencies:
   - `matchMedia`
   - `ResizeObserver`
   - stubs remain active even when tests call global un-stub helpers
2. Update route tests if selector strategy changes due to Ant structure updates:
   - prefer role/label queries and helper methods for Ant `Select`/`Segmented` interaction
   - avoid brittle class-name selectors
3. Run:
   - `npm run lint --workspace=frontend`
   - `npm run test --workspace=frontend`
   - `npm run build --workspace=frontend`

## Acceptance Criteria

1. No mixed light/dark visual mismatch remains on Product Detail.
2. Ant components on Product Detail visually align with app token system.
3. Root cause is identified and documented as app-surface, token, or Ant-token issue (or combination).
4. History filter controls are grouped and readable without crowding.
5. URL-backed history behavior is unchanged.
6. Lint, tests, and build pass.

## Risks And Mitigations

1. Risk: global Ant token mapping unintentionally changes other views.
   Mitigation: use route-scoped rollout first, then promote globally only after cross-route visual smoke checks.

2. Risk: test fragility due Ant DOM structure changes.
   Mitigation: use role/label-based queries, centralized interaction helpers, and stable test-env stubs for browser APIs.

3. Risk: responsive layout regressions at uncommon widths.
   Mitigation: explicitly validate at small/tablet/desktop breakpoints before close.
