# FRONTEND_COMPONENT_DECOMPOSITION_IMPLEMENTATION.md

## Status

Implemented (2026-03-06)

## Goal

Reduce frontend component complexity by splitting large UI files into smaller, single-responsibility feature components while preserving current behavior, styling, and route/search-state semantics.

## Why This Refactor

Current frontend architecture is feature-first, but a few files are too large and mix orchestration with dense UI rendering. This increases maintenance cost, onboarding time, and regression risk.

Highest-impact targets:

1. `frontend/src/features/products/components/product-detail-view.tsx`
2. `frontend/src/routes/run-detail-page.tsx`
3. `frontend/src/routes/dashboard-home-page.tsx`
4. `frontend/src/routes/runs-page.tsx`
5. `frontend/src/app/theme-provider.tsx` (secondary)

## Non-Goals

1. No visual redesign.
2. No API contract changes.
3. No route URL/search behavior changes.
4. No backend changes.

## Refactor Rules

1. Keep routes thin: route files orchestrate params/search/query loading; feature components render sections.
2. Keep complex transformation logic in hooks/utils, not JSX files.
3. Keep exported types/interfaces in parent `types/` folders.
4. Reuse existing constants and shared helpers; do not duplicate literals.
5. Preserve existing accessibility labels/roles and keyboard behavior.
6. Keep styling ownership explicit:
   - feature section styles stay in feature CSS modules
   - route CSS modules keep page shell/layout only
   - shared style primitives/tokens stay in `styles/` or `shared/ui`
7. Each new extracted component must have:
   - colocated `types/*` for exported props/types
   - no new inline exported interfaces in `.tsx` files
8. Do not introduce new cross-feature dependencies during extraction.

## Target Structure

### Products

Create section components under:

- `frontend/src/features/products/components/detail/`

Planned components:

1. `product-detail-header.tsx`
2. `product-critical-overview.tsx`
3. `product-history-controls-section.tsx`
4. `product-history-chart.tsx`
5. `product-history-summary-cards.tsx`
6. `product-history-visual-state.tsx`
7. `product-history-table.tsx`
8. `product-recent-runs.tsx`

### Runs

Create section components under:

- `frontend/src/features/runs/components/detail/`

Planned components:

1. `run-failure-panel.tsx`
2. `run-metrics-grid.tsx`
3. `run-changes-section.tsx`
4. `run-products-section.tsx`

### Dashboard

Create reusable dashboard panel components under:

- `frontend/src/features/runs/components/dashboard/`

Planned components:

1. `dashboard-run-list-panel.tsx`
2. `dashboard-summary-grid.tsx`
3. `runs-filters.tsx`
4. `runs-table-section.tsx`

Dashboard ownership decision:

1. Dashboard views are run-centric in this project and remain owned by `features/runs`.
2. The placeholder `frontend/src/features/dashboard` must be removed in this refactor to avoid split ownership.

### Shared Theme Composition

Create theme helper modules under:

- `frontend/src/app/theme/`

Planned modules:

1. `theme-token-reader.ts`
2. `use-system-theme.ts`
3. keep `theme-provider.tsx` as composition shell

## Implementation Phases

### Phase 1: Product Detail Decomposition

Scope:

1. Split `product-detail-view.tsx` into detail section components.
2. Keep current CSS module and class names during split to minimize visual regression.
3. Move chart config/format callbacks into a dedicated helper if needed.
4. Add props/types files for each extracted component under `features/products/types`.

Acceptance:

1. Main product detail container becomes an orchestrator component.
2. Section components are each focused and independently testable.
3. No behavior or style regression in product detail page.
4. `product-detail-view.tsx` reduced to <= 200 lines.
5. No extracted component exceeds 180 lines.
6. No exported interfaces/types declared inline in extracted `.tsx` files.

### Phase 2: Run Detail Decomposition

Scope:

1. Move run detail sections from route into `features/runs/components/detail/*`.
2. Keep `run-detail-page.tsx` for query/search orchestration and section wiring only.
3. Preserve current filtering/pagination behavior.
4. Move section prop contracts into `features/runs/types/*`.

Acceptance:

1. Route file is <= 180 lines and free of dense section markup.
2. Failure metadata rendering behavior remains unchanged.
3. Existing run detail tests continue passing.
4. No extracted detail section component exceeds 180 lines.
5. No exported interfaces/types declared inline in extracted `.tsx` files.

### Phase 3: Dashboard + Runs Page Decomposition

Scope:

1. Extract repeated dashboard panel markup to reusable panel component.
2. Extract runs-page filter row and table section into feature components.
3. Optional: add hook for dashboard category filter state derivation.
4. Remove `frontend/src/features/dashboard` placeholder folder.

Acceptance:

1. Reduced duplication in dashboard panels.
2. Route pages become orchestration-focused.
3. Filter and pagination behavior unchanged.
4. `dashboard-home-page.tsx` reduced to <= 160 lines.
5. `runs-page.tsx` reduced to <= 140 lines.
6. `features/dashboard` no longer exists.

### Phase 4: Theme Provider Simplification

Scope:

1. Move token-reading and system theme subscription logic out of provider file.
2. Keep provider focused on `ConfigProvider` theme composition.
3. Keep behavior equivalent for first paint and system-theme changes.

Acceptance:

1. `theme-provider.tsx` is a thin composition wrapper.
2. No change in light/dark behavior.
3. No hydration warnings in dev console when loading the app.
4. No initial theme flicker regression relative to current behavior.

## Test Plan

Run after each phase:

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`

Targeted checks (existing suites):

1. Product detail tests:
   - `frontend/src/features/products/utils/product-detail-view.test.ts`
   - `frontend/src/routes/scrape-views.test.tsx`
2. Run detail + dashboard:
   - `frontend/src/routes/scrape-views.test.tsx`
3. Settings/runs route integrity:
   - `frontend/src/routes/auth-routing.test.tsx`
   - `frontend/src/routes/settings-page.test.tsx`

New tests to add during this refactor:

1. Product detail extracted components:
   - render tests for each section component
   - interaction tests for history controls callbacks
2. Run detail extracted sections:
   - failure panel (admin vs non-admin technical message visibility)
   - diff/products section empty/loading/error/success rendering
3. Dashboard extracted panels:
   - panel list rendering with max-item truncation
   - empty-state coverage
4. Theme modules:
   - token reader unit tests for fallback/default behavior
   - system-theme hook tests for media query subscription/unsubscription

Architecture checks to run after each phase:

1. `rg "routes/.*module.scss" frontend/src/features -n` must return no feature imports of route styles.
2. `rg "^export (interface|type)" frontend/src/features frontend/src/components frontend/src/shared/hooks -g"*.tsx" -n`
   should return only approved re-exports; exported type declarations should be in `types/` files.
3. `rg "from \"..*/features/.*/" frontend/src/features -n` should not show disallowed cross-feature imports.

## Risk Areas and Mitigation

1. **Styling regressions during component extraction**
   - Mitigation: keep existing class names and CSS module references in first pass.
2. **Search state regressions**
   - Mitigation: keep state updates in route-level orchestrators.
3. **Over-fragmentation**
   - Mitigation: split by section boundaries, not tiny presentational wrappers.

## Definition of Done

1. Target files are split per phase with clear ownership.
2. Large route/components are reduced and easier to scan.
3. Lint, tests, and build are green after each phase.
4. No user-facing behavior changes.
5. Measurable file-size targets in each phase are met.
6. Extracted component props/types are in `types/` folders.
7. `frontend/src/features/dashboard` placeholder is removed.

## Suggested Execution Order

1. Phase 1 (Product Detail)
2. Phase 2 (Run Detail)
3. Phase 3 (Dashboard + Runs)
4. Phase 4 (Theme Provider)
