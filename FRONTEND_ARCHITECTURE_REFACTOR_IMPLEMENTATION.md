# FRONTEND_ARCHITECTURE_REFACTOR_IMPLEMENTATION.md

## Status

In progress

## Completed in this pass (2026-03-06)

1. Phase 2 style ownership split:
   - moved settings tab/shared styling consumption to `features/settings/components/settings-shared.module.scss`
   - removed feature dependency on `routes/settings-page.module.scss`
2. Phase 3 category ownership move:
   - `CategoryTreeSelect` moved under `features/categories/components`
   - old path kept as temporary shim export
3. Phase 4 products/runs decoupling:
   - products history hooks now consume shared formatters/navigation defaults
   - no remaining `features/products/* -> features/runs/*` imports
4. Phase 4A constants centralization:
   - added `features/runs/constants/run-filters.constants.ts`
   - added `shared/constants/stock.constants.ts`
   - replaced duplicated inline run filter options in route components
5. Phase 4B type extraction:
   - moved exported interfaces from key component/hook files into parent `types/` folders:
     - app-select
     - data-table
     - pagination controls + page-window
     - sort-header
     - shared hooks (`use-route-search-updater`, `use-clamped-page`)
     - settings hooks
     - runs column hooks
6. Unit tests added for centralized constants:
   - `features/runs/constants/run-filters.constants.test.ts`
   - `features/products/constants/product-detail.constants.test.ts`

## Goal

Refactor the frontend into a stricter feature-first architecture with clear ownership boundaries, while keeping current behavior and UI unchanged.

## Why

Current architecture is mostly feature-based, but there are boundary leaks:

1. Feature components import route-level styles.
2. Cross-feature imports (`products` consuming `runs` formatting/search helpers).
3. Domain-specific components are placed in global `components/`.
4. Empty/unused feature slice (`features/dashboard`) causes ownership ambiguity.
5. Repeated hardcoded UI/domain values exist in components/routes instead of constants modules.
6. Many interfaces/types are defined inline in component/hook files instead of parent `types/` folders.

## Non-Goals

1. No visual redesign.
2. No API contract changes.
3. No large behavior rewrites.
4. No route URL/search param behavior changes.

## Audit Findings (2026-03-06)

### Hardcoded Values (examples)

1. Filter options and labels hardcoded inside route/components:
   - `frontend/src/routes/runs-page.tsx`
   - `frontend/src/routes/run-detail-page.tsx`
   - `frontend/src/features/products/components/product-detail-view.tsx`
2. Repeated status/stock label strings:
   - `frontend/src/features/products/components/product-detail-view.tsx`
   - `frontend/src/features/products/hooks/use-product-history-view-model.ts`
   - `frontend/src/features/runs/hooks/use-run-detail-columns.tsx`
3. UI action strings repeated in multiple components:
   - `frontend/src/features/settings/components/*.tsx`
   - `frontend/src/routes/product-detail-page.tsx`

### Inline Types/Interfaces Outside `types/` (examples)

1. UI component props interfaces:
   - `frontend/src/components/app-select/AppSelect.tsx`
   - `frontend/src/components/category-tree-select/CategoryTreeSelect.tsx`
   - `frontend/src/components/data-table/DataTable.tsx`
   - `frontend/src/components/pagination/PaginationControls.tsx`
   - `frontend/src/components/sort-header/SortHeader.tsx`
2. Hook option/result interfaces:
   - `frontend/src/shared/hooks/use-route-search-updater.ts`
   - `frontend/src/shared/hooks/use-clamped-page.ts`
   - `frontend/src/features/settings/hooks/use-settings-*.ts`
   - `frontend/src/features/runs/hooks/use-*.tsx`
3. Utility/service interfaces:
   - `frontend/src/lib/api/client.ts`
   - `frontend/src/shared/notifications/notification-provider.tsx`
   - `frontend/src/shared/notifications/request-tracker.ts`

## Target Architecture

1. `routes/`: page assembly, route params/search/loaders only.
2. `features/<feature>/`: domain UI + hooks + feature types/constants/api.
3. `shared/`: generic, domain-agnostic primitives/utilities only.
4. `components/`: deprecated in favor of `shared/ui` and feature-local components.

## New Architecture Rules

1. No repeated hardcoded domain/UI option arrays in route/component files.
2. Use constants ownership:
   - Feature-specific: `features/<feature>/constants/*`
   - Cross-feature/shared UI constants: `shared/constants/*`
3. Exported/public `interface`/`type` declarations must live in parent `types/` folders.
4. Place type declarations in parent `types/` folders:
   - `features/<feature>/types/*`
   - `shared/<module>/types/*`
   - `shared/ui/<component>/types/*`
5. Allowed exceptions:
   - Module augmentation files (e.g. TanStack Router register in `app/bootstrap.ts`)
   - `z.infer` exports in `schemas.ts` files
   - Test-only local fixture types when tightly scoped to a single test file
   - Non-exported local helper types/interfaces for file-local readability
6. Constants extraction threshold:
   - Must centralize if value set is reused in 2+ files, contains business semantics, or is likely localization text.
   - One-off presentational labels may stay local.

## Execution Strategy

Use incremental phases with passing lint/tests/build after each phase.

---

## Phase 0: Governance Baseline

### Changes

1. Add architecture enforcement before refactor moves:
   - import boundaries (`eslint-plugin-boundaries` or equivalent)
   - no route-style imports from features
   - no cross-feature imports except explicitly allowed shared contracts
2. Add AST-based architecture checks (ESLint custom rules or typed rule plugin):
   - enforce exported type/interface placement
   - flag disallowed repeated inline option arrays
3. Add `npm` script:
   - `npm run lint:architecture --workspace=frontend`

### Acceptance Criteria

1. Governance checks run in CI and locally before structural refactors.
2. Refactor phases cannot proceed with policy violations.

---

## Phase 1: Establish Structure and Guardrails

### Changes

1. Create target folders:
   - `frontend/src/shared/ui`
   - `frontend/src/shared/formatters`
   - `frontend/src/shared/navigation`
   - `frontend/src/shared/types`
2. Define explicit allowed import graph in docs and lint config:
   - `routes -> features, shared, lib`
   - `features/<x> -> shared, lib, features/<x>`
   - `features/<x> -> features/<y>` disallowed unless via documented shared adapter module
3. Add constants/type placement conventions to contributor docs.
4. Add a short architecture note in `documentation/backend/` equivalent frontend docs location (or create `documentation/frontend/ARCHITECTURE.md` if missing).

### Acceptance Criteria

1. Lint fails on forbidden imports.
2. Architecture check fails on new inline types and hardcoded option arrays in disallowed folders.
3. No runtime behavior changes.

---

## Phase 2: Decouple Settings Feature from Route Styles

### Changes

1. Move settings UI styles out of route module:
   - Create `frontend/src/features/settings/components/settings-shared.module.scss`.
2. Update these components to use feature-owned styles:
   - `account-tab.tsx`
   - `tracking-tab.tsx`
   - `notifications-tab.tsx`
   - `plan-tab.tsx`
   - `admin-tab.tsx`
   - `settings-tabs.tsx`
   - `settings-summary.tsx`
3. Keep `routes/settings-page.module.scss` for page shell/layout only.

### Acceptance Criteria

1. No `features/settings/*` file imports `routes/settings-page.module.scss`.
2. Settings UI renders the same and existing tests pass.

---

## Phase 3: Move Category Domain UI into Category Feature

### Changes

1. Move:
   - `frontend/src/components/category-tree-select/CategoryTreeSelect.tsx`
   to:
   - `frontend/src/features/categories/components/category-tree-select.tsx`
2. Update all imports in routes/features.
3. Optional transition shim:
   - Keep old file re-export temporarily for one pass, then remove.

### Acceptance Criteria

1. Category selector ownership is in `features/categories`.
2. No remaining imports from old path.

---

## Phase 4: Remove Cross-Feature Coupling (Products ↔ Runs)

### Changes

1. Extract shared formatting/navigation helpers from `features/runs` into `shared`:
   - Date/time formatting helpers.
   - Reusable URL-search defaults used by multiple features.
2. Replace imports in `features/products/*` and `routes/*` to use shared modules.
3. Keep run-specific business formatting in `features/runs/formatters.ts`.

### Acceptance Criteria

1. `features/products/*` no longer imports from `features/runs/*`.
2. Product detail/history tests remain green.

---

## Phase 4A: Centralize Constants and Labels

### Changes

1. Create/extend constants files by ownership:
   - `features/runs/constants/*` for run filter option labels/values used in runs UIs
   - `features/products/constants/*` for product history control options and repeated labels
   - `features/settings/constants/*` for settings tab/action labels
   - `shared/constants/*` for cross-feature UI constants
2. Move hardcoded option arrays and repeated labels from:
   - `routes/runs-page.tsx`
   - `routes/run-detail-page.tsx`
   - `features/products/components/product-detail-view.tsx`
   - `features/settings/components/*.tsx`
3. Keep route/components consuming constants only for reusable/business option sets.
4. Keep one-off purely presentational labels local to reduce indirection.

### Acceptance Criteria

1. No duplicated option arrays across route/component files for same domain.
2. Constants are imported from feature/shared constants modules.

---

## Phase 4B: Extract Types and Interfaces to `types/` Folders

### Changes

1. Move UI props/options interfaces to type modules:
   - `shared/ui/*/types/*.ts` for generic UI components
   - `features/<feature>/types/*.ts` for feature component/hook types
2. Refactor these files to import types instead of declaring inline:
   - `components/app-select/AppSelect.tsx`
   - `components/category-tree-select/CategoryTreeSelect.tsx` (or feature-local path after move)
   - `components/data-table/DataTable.tsx`
   - `components/pagination/PaginationControls.tsx`
   - `components/sort-header/SortHeader.tsx`
   - `shared/hooks/use-route-search-updater.ts`
   - `shared/hooks/use-clamped-page.ts`
   - `features/settings/hooks/use-settings-*.ts`
   - `features/runs/hooks/use-*.tsx`
3. Keep schemas-derived type aliases in schema/type modules, not in components.
4. Keep file-local non-exported helper types only when they are not reused.

### Acceptance Criteria

1. No exported `interface/type` declarations in component/hook files (except allowlist).
2. Type definitions are discoverable in parent `types/` folders.

---

## Phase 5: Consolidate Generic UI Primitives

### Changes

1. Move reusable primitives from `components/` to `shared/ui/`:
   - `DataTable`
   - `PaginationControls`
   - `SortHeader`
   - `AppSelect`
2. Keep domain-specific UI in feature folders.
3. Update imports across app.

### Acceptance Criteria

1. `components/` either removed or left only as temporary re-export shims.
2. All imports resolve to `shared/ui` or feature-local components.

---

## Phase 6: Cleanup and Ownership Finalization

### Changes

1. Remove empty `features/dashboard` folder (or implement real dashboard feature module if intended).
2. Run dead-file/import cleanup.
3. Add architecture checklist to PR template or contributor notes.

### Acceptance Criteria

1. No empty placeholder feature folders.
2. Folder ownership is clear from tree alone.

---

## Testing and Verification Plan

Run after each phase:

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`
4. `npm run lint:architecture --workspace=frontend`

Additional checks:

1. Search for forbidden imports:
   - `rg "routes/settings-page.module.scss" frontend/src/features -n`
   - `rg "from \\\"../../runs/|from \\\"../runs/" frontend/src/features/products -n`
2. Search for inline type declarations outside allowed files:
   - `rg "^(export\\s+)?(interface|type)\\s" frontend/src -g"*.ts" -g"*.tsx" -n`
3. Search for hardcoded option arrays in route/component files:
   - `rg "const\\s+.*=\\s*\\[|\\{\\s*label:\\s*\\\"" frontend/src/routes frontend/src/features -g"*.tsx" -n`
4. Manual smoke checks:
   - `/app/settings`
   - `/app`
   - `/app/runs`
   - `/app/runs/:id`
   - `/app/products/:id`

## Phase Dependencies

1. Phase 0 blocks all other phases.
2. Phase 3 and Phase 5 must be coordinated (component path moves).
3. Phase 4 must complete before Phase 4A/4B finalize ownership to avoid duplicate edits.
4. Phase 6 runs only after all prior acceptance criteria pass.

## Test Impact Matrix

### Phase 0 (Governance Baseline)

1. New/updated checks:
   - `lint:architecture` script and CI wiring
2. Test updates expected:
   - none for runtime/unit tests
   - CI/lint pipeline assertions updated
3. Verify:
   - `npm run lint --workspace=frontend`
   - `npm run lint:architecture --workspace=frontend`

### Phase 1 (Structure + Boundaries)

1. New/updated checks:
   - import-boundary lint rules and allowlists
2. Test updates expected:
   - minimal; only if import aliases/paths change
3. Verify:
   - `npm run lint --workspace=frontend`
   - `npm run lint:architecture --workspace=frontend`
   - `npm run test --workspace=frontend`

### Phase 2 (Settings Style Decoupling)

1. Test files most likely impacted:
   - `frontend/src/routes/settings-page.test.tsx`
2. Test updates expected:
   - selectors only if semantic structure changes
   - no behavior assertion changes
3. Verify:
   - `npm run test --workspace=frontend -- settings-page.test.tsx`
   - `npm run test --workspace=frontend`

### Phase 3 (Category Component Ownership Move)

1. Test files most likely impacted:
   - `frontend/src/routes/settings-page.test.tsx`
   - `frontend/src/routes/scrape-views.test.tsx`
   - any tests importing old category component path
2. Test updates expected:
   - import path updates
   - no UX behavior changes
3. Verify:
   - `npm run test --workspace=frontend -- settings-page.test.tsx`
   - `npm run test --workspace=frontend -- scrape-views.test.tsx`
   - `npm run test --workspace=frontend`

### Phase 4 (Products/Runs Decoupling)

1. Test files most likely impacted:
   - `frontend/src/routes/scrape-views.test.tsx`
   - `frontend/src/features/products/utils/product-detail-view.test.ts`
   - `frontend/src/features/products/history-controls.test.ts`
2. Test updates expected:
   - import path updates for moved shared formatters/search helpers
   - assertions unchanged unless labels intentionally centralized/updated
3. Verify:
   - `npm run test --workspace=frontend -- scrape-views.test.tsx`
   - `npm run test --workspace=frontend`

### Phase 4A (Constants Centralization)

1. New tests to add:
   - constants module unit tests for:
     - runs filter options
     - run detail change/stock filter options
     - product history range/stock options
2. Test files most likely impacted:
   - route tests asserting exact labels/options
3. Verify:
   - `npm run test --workspace=frontend`
   - ensure constants tests pass and coverage includes new modules

### Phase 4B (Type Extraction)

1. Test updates expected:
   - generally none for behavior
   - import/type-only adjustments in tests if paths moved
2. Verify:
   - `npm run lint --workspace=frontend`
   - `npm run build --workspace=frontend`
   - `npm run test --workspace=frontend`

### Phase 5 (Shared UI Consolidation)

1. Test files most likely impacted:
   - `frontend/src/components/data-table/DataTable.test.tsx`
   - `frontend/src/components/pagination/PaginationControls.test.tsx`
   - `frontend/src/components/sort-header/SortHeader.test.tsx`
   - route tests that rely on component-specific behavior
2. Test updates expected:
   - moved test file paths/imports
   - no functional behavior changes
3. Verify:
   - run impacted suites individually, then full frontend suite

### Phase 6 (Cleanup)

1. Test updates expected:
   - remove dead tests tied to removed placeholders only
2. Verify:
   - `npm run lint --workspace=frontend`
   - `npm run lint:architecture --workspace=frontend`
   - `npm run test --workspace=frontend`
   - `npm run build --workspace=frontend`

### Global Rule During Refactor

1. After each phase, do not proceed unless all of the following pass:
   - `npm run lint --workspace=frontend`
   - `npm run lint:architecture --workspace=frontend`
   - `npm run test --workspace=frontend`
   - `npm run build --workspace=frontend`

## Risk Management

1. Styling regressions:
   - Mitigation: move styles first with no class renaming where possible.
2. Broken imports during moves:
   - Mitigation: temporary re-export shims for one step, then remove.
3. Hidden behavior changes in shared helper extraction:
   - Mitigation: keep function signatures and unit tests identical during move.

## Deliverables

1. Refactored frontend folder structure aligned with feature-first architecture.
2. Enforced import boundaries.
3. Centralized constants with clear feature/shared ownership.
4. Type declarations moved to parent `types/` folders with enforceable rules.
5. Updated docs describing architecture and ownership rules.
6. Green lint/test/build after final phase.

## Suggested Implementation Order

1. Phase 0 (governance baseline)
2. Phase 1 (target structure + documented boundaries)
3. Phase 2 (settings style decoupling)
4. Phase 3 (category component ownership)
5. Phase 4 (products/runs decoupling)
6. Phase 4A (constants centralization)
7. Phase 4B (type/interface extraction)
8. Phase 5 (shared UI consolidation)
9. Phase 6 cleanup

This order minimizes churn and reduces risk of repeated import rewrites.
