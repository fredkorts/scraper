# Frontend Structure Cleanup Implementation

## Status

In progress.

Completed in this pass:

1. Phase 0 baseline applied for Settings slice.
2. Phase 1 Settings decomposition implemented.
3. Phase 2 auth route family migrated to `features/auth/views/*` with thin route wrappers.
4. Phase 2 runs route family (`dashboard-home`, `runs`, `changes`) migrated to `features/runs/views/*` with thin route wrappers.
5. Phase 2 run detail route migrated to `features/runs/views/run-detail-page` and route-level shared stylesheet removed.
6. Phase 2 product-detail route family migrated to `features/products/views/product-detail-page` with thin route wrapper.
7. Remaining small route pages (`landing`, `forbidden`, `not-found`, `global-error`) migrated to `features/public/views/*`, and `routes/Page.module.scss` removed.
8. Phase 3 guardrails started:
    1. `FRONTEND_STRUCTURE_GUIDELINES.md` added.
    2. ESLint route-page import boundary rules added (`src/routes/*-page.tsx`).
9. Added second lint guardrail as warning for feature-to-feature deep imports (`src/features/**/*.{ts,tsx}`), with planned promotion to error after cleanup.
10. Added feature-level barrel exports for `auth`, `categories`, `runs`, and `settings`.
11. Added `features/products/index.ts` as a public export surface to remove remaining cross-feature deep imports from runs hooks.
12. Replaced all current cross-feature deep imports with feature barrel imports; frontend lint now has zero deep-import warnings.

## Objective

Improve readability and maintainability across `frontend/src` by introducing a consistent, feature-first folder structure and decomposing oversized route/view components (starting with Settings).

## Scope

1. Refactor `settings` route/view first (`tracking-tab.tsx` decomposition is mandatory).
2. Establish and apply folder conventions to all route/view surfaces.
3. Keep behavior unchanged during structural refactor.
4. Keep existing shared components (`AppButton`, `DataTable`, notifications, etc.) as source of truth.

Out of scope:

1. UX redesign.
2. API contract changes.
3. Business-logic rewrites unrelated to decomposition.

## Target Structure Standard

For each feature route/view:

1. `views/<view-name>/`
2. `views/<view-name>/<ViewName>.tsx`
3. `views/<view-name>/<view-name>.module.scss` (only if needed)
4. `views/<view-name>/types/` (only if needed)
5. `views/<view-name>/hooks/` (only local hooks)
6. `views/<view-name>/components/` (view-specific child components only)
7. `views/<view-name>/index.ts` (public exports for that view)

Feature-shared UI remains under `features/<feature>/components/`.
App-wide shared UI remains under `src/components/`.

## Architecture Rules

1. Container/presentational split:
    1. container owns query/mutation/state and orchestration
    2. presentational components are props-driven and side-effect light
2. No cross-feature deep imports. Use feature public exports (`index.ts`) when crossing boundaries.
3. Do not create empty `types/`, `hooks/`, or `components/` folders; create only when needed.
4. Avoid duplicate abstractions:
    1. `TrackedCategoriesSection` and `TrackedProductsSection` stay separate (different actions/states)
    2. extract shared shell/layout primitives only where identical.
5. Route files must stay thin: loader wiring + composition only.

## Phase 0: Baseline and Safety Setup (Required Before Refactor)

1. Produce a route/view inventory matrix:
    1. current file locations
    2. target locations
    3. owner
    4. planned PR slice
2. Define per-slice definition of done:
    1. imports updated and no deep cross-feature imports introduced
    2. no route loader/search behavior change
    3. lint/test/build green for frontend
3. Establish compatibility strategy for moves:
    1. allow temporary re-export shims only within the same feature
    2. remove shims in the immediately following slice
4. Freeze feature work in files currently being moved to avoid merge churn.

## Phase 1: Settings Decomposition (First Delivery)

### 1.1 Split tracking tab

Refactor `frontend/src/features/settings/components/tracking-tab.tsx` into:

1. `TrackedCategoriesSection`
2. `TrackedProductsSection`
3. optional local shared section shell (header/body/loading/error wrapper)

Keep current behavior:

1. tracked categories create/remove flow
2. tracked products list/untrack flow
3. slot usage display and notifications

### 1.2 Move route composition

1. Introduce `features/settings/views/settings-page/`.
2. Keep `frontend/src/routes/settings-page.tsx` as thin route composition entry.
3. Preserve URL-backed tab behavior and admin fallback behavior.

### 1.3 Co-locate local types/hooks

1. Move settings-view-specific prop/state types next to their owning view/components.
2. Keep feature-wide reusable types in `features/settings/types/`.

## Phase 2: Route/View Standardization Across Frontend

Apply same pattern route-by-route:

1. auth views
2. dashboard home
3. runs list and run detail
4. changes explorer
5. product detail/history
6. settings admin subviews

For each route:

1. move files
2. update imports and barrel exports
3. keep behavior and tests stable
4. complete verification before moving to next route
5. keep each PR limited to one route/view family to preserve reviewability

## Phase 3: Guardrails

1. Add `documentation/frontend/FRONTEND_STRUCTURE_GUIDELINES.md`:
    1. folder conventions
    2. import boundary rules
    3. examples of container vs presentational split
2. Add lint guardrails for import boundaries where practical.
3. Add naming standards for:
    1. hooks (`use-*`)
    2. files (`kebab-case` for folders, existing project standard for TSX files)
    3. export surfaces (`index.ts` per view/feature surface)
4. Add a short reviewer checklist for refactor PRs:
    1. behavior unchanged
    2. route-level tests still pass
    3. no new circular import warnings
    4. no dead files left behind

## Testing and Verification Strategy

After each phase slice:

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`
4. run targeted route tests for touched route families (for faster feedback before full suite).

After major route migration batch:

1. run a smoke pass for:
    1. auth flow
    2. settings tabs
    3. run detail and changes explorer navigation
    4. product detail view actions
2. run existing frontend a11y tests for affected views.

## Risks and Mitigations

1. Risk: import path churn causes regressions.
    1. Mitigation: route-by-route slices and immediate test pass per slice.
2. Risk: over-abstraction creates indirection.
    1. Mitigation: only extract shared wrappers when identical props/behavior are proven.
3. Risk: circular dependencies via barrel exports.
    1. Mitigation: feature-level public export surfaces; avoid mutual re-exports.
4. Risk: large PR becomes unreviewable.
    1. Mitigation: split into small PRs by route/view.
5. Risk: route behavior regressions caused by accidental loader/search-state edits during file moves.
    1. Mitigation: no loader/search changes allowed in structure-only PRs; enforce in reviewer checklist.
6. Risk: stale compatibility shims become permanent and hide architecture debt.
    1. Mitigation: track shim removals in next-slice checklist; fail slice completion if shims remain.

## Acceptance Criteria

1. Settings tracking UI is decomposed into focused subcomponents (categories/products).
2. Settings route files and view files are clearly separated (thin route entry).
3. Every migrated route/view follows the target structure standard.
4. No UX or behavior regressions.
5. Frontend lint/test/build pass after each migration slice.
