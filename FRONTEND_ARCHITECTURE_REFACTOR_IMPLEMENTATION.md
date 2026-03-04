# Frontend Architecture Refactor Implementation Plan

## Summary

Refactor the frontend so it is easier to maintain, safer to extend, and faster for new developers to understand.  
Primary goals:

1. enforce consistent structure for `types`, `constants`, `enums`, and `hooks`
2. separate UI rendering from non-trivial logic
3. remove duplicated orchestration logic (search state, pagination clamping, derived view-model logic)
4. keep behavior stable while improving readability and testability

This plan is aligned with the current stack:
- React 19
- TanStack Router
- TanStack Query
- TanStack Table
- React Hook Form + Zod
- TypeScript + Vitest

## Scope

In scope:

1. route/component decomposition where files are overloaded (`settings-page.tsx` first)
2. feature-level folder normalization:
   - `types/`
   - `constants/`
   - `enums/` (or union constants with typed literals)
   - `hooks/`
3. shared primitives for cross-feature logic under:
   - `frontend/src/shared/types`
   - `frontend/src/shared/constants`
   - `frontend/src/shared/enums`
   - `frontend/src/shared/hooks`
4. query/data orchestration cleanup (remove duplicate query paths and keys where unnecessary)
5. accessibility and error-message consistency for refactored views

Out of scope:

1. visual redesign
2. API contract changes
3. backend changes

## Architecture Rules (Target Standards)

1. Components render UI; hooks orchestrate logic.
2. Route files compose page sections and route params/search only.
3. Non-trivial derived state lives in hooks/selectors, not inline JSX.
4. Reusable constants/types/enums must not be declared ad hoc in route files.
5. Cross-feature reusable logic must move to `shared/*`.
6. Prefer `const` union values over TypeScript `enum` unless external integration requires enum objects.
7. User-facing errors must be sanitized; technical detail remains in logs/dev tools.
8. Do not replace one large component with one large hook:
   - split domain hooks by responsibility
   - keep orchestration hooks thin and compositional
9. Promote to `shared/*` only when reused in 2+ features or when it is infrastructure-level behavior.

## Target Folder Structure

```txt
frontend/src/
  shared/
    hooks/
    types/
    constants/
    enums/
  features/
    settings/
      hooks/
      types/
      constants/
      enums/
      components/
      queries.ts
      mutations.ts
      schemas.ts
      search.ts
    runs/
      hooks/
      types/
      constants/
      enums/
      ...
    products/
      hooks/
      types/
      constants/
      enums/
      ...
    categories/
      hooks/
      types/
      constants/
      enums/
      ...
  routes/
    settings-page.tsx
    runs-page.tsx
    run-detail-page.tsx
    product-detail-page.tsx
```

## Workstream A: Conventions + Scaffolding

### A1. Create structure

1. Add missing `hooks/`, `types/`, `constants/`, `enums/` directories for each active feature.
2. Add `frontend/src/shared/{hooks,types,constants,enums}`.
3. Create folders only when used; avoid empty-folder churn.

### A2. Add architecture guardrails

1. Add lightweight lint rule guidance:
   - enforce file complexity / max-lines limits for route files
   - enforce import boundaries so routes cannot become utility dumping grounds
   - prefer code-review checklist as complement, not replacement
2. Add short README section (`frontend` or root README) describing folder conventions.

## Workstream B: Settings Refactor (First Priority)

`settings-page.tsx` is currently the highest-leverage refactor target.

### B1. Split view-model logic into hooks

Create:

1. `frontend/src/features/settings/hooks/use-settings-account.ts`
2. `frontend/src/features/settings/hooks/use-settings-tracking.ts`
3. `frontend/src/features/settings/hooks/use-settings-notifications.ts`
4. `frontend/src/features/settings/hooks/use-settings-admin.ts`
5. `frontend/src/features/settings/hooks/use-settings-tabs.ts`
6. optional thin composition hook:
   - `frontend/src/features/settings/hooks/use-settings-page-view-model.ts`
   - only aggregates outputs from domain hooks

Responsibilities:

1. domain query + mutation orchestration per tab/section
2. derived role/plan labels via pure helpers
3. category option derivation in tracking/admin hooks only
4. action handlers scoped by domain (track/untrack, channel management, admin controls)
5. loading/error gates composed from domain hook state

### B2. Extract constants/types

Create:

1. `frontend/src/features/settings/constants/settings.constants.ts`
2. `frontend/src/features/settings/types/settings-ui.types.ts`

Move:

1. `tabLabels`
2. `roleLabelMap`
3. notification/plan label helpers
4. local helper return types used by hooks/components

### B3. Split tab sections into focused components

Create:

1. `frontend/src/features/settings/components/account-tab.tsx`
2. `frontend/src/features/settings/components/tracking-tab.tsx`
3. `frontend/src/features/settings/components/notifications-tab.tsx`
4. `frontend/src/features/settings/components/plan-tab.tsx`
5. `frontend/src/features/settings/components/admin-tab.tsx`
6. `frontend/src/features/settings/components/settings-summary.tsx`
7. `frontend/src/features/settings/components/settings-tabs.tsx`

`settings-page.tsx` should become an assembler, not a logic hub.

### B4. Accessibility hardening for tabs

1. implement complete tab semantics (`tab`, `tablist`, `tabpanel`, `aria-controls`, `id`)
2. keyboard support for tab navigation
3. ensure focus management is deterministic

## Workstream C: Runs/Product Pages Refactor

### C1. Extract repeated search-state orchestration hooks

Create shared hooks:

1. `frontend/src/shared/hooks/use-route-search-updater.ts`
2. `frontend/src/shared/hooks/use-clamped-page.ts`
3. ensure both hooks are strongly typed to route search schemas (generic constraints, no `any` fallback)

Use in:

1. `runs-page.tsx`
2. `run-detail-page.tsx`
3. `product-detail-page.tsx` (for control updates)

### C2. Move table column definitions out of route files

Create:

1. `frontend/src/features/runs/hooks/use-runs-table-columns.tsx`
2. `frontend/src/features/runs/hooks/use-run-detail-columns.tsx`
3. `frontend/src/features/products/hooks/use-product-history-columns.tsx`

Important:

1. Use factory hooks/functions, not static constants, because columns depend on router actions, search state, and formatters.

### C3. Move product-history derived logic into hooks/selectors

Create:

1. `frontend/src/features/products/hooks/use-product-history-view-model.ts`

Move from route:

1. chart data mapping
2. category options derivation
3. filter-summary composition

## Workstream D: Data/Query Cleanup

### D1. Remove duplicate admin category query strategy

1. collapse to one canonical categories source for admin + non-admin where possible
2. remove extra key if no distinct payload exists
3. simplify invalidation paths

### D2. Standardize error normalization

1. create shared helper for user-visible error text:
   - `frontend/src/shared/constants/error-messages.ts`
   - `frontend/src/shared/utils/normalize-user-error.ts`
2. map backend error codes to safe, user-readable messages with sensible fallback
2. prevent raw backend message leakage in UI where not intended

## Workstream E: Tests + Safety Gates

### E1. Unit tests

1. settings view-model hooks
2. shared route-search hooks
3. column factory helpers (smoke tests)
4. product-history view-model hooks
5. error-code normalization mapper

### E2. Integration tests

1. settings route tab behavior and role gating
2. settings tab keyboard/a11y behavior
3. runs and run-detail pagination clamping regression tests
4. query invalidation behavior after query-key cleanup

### E3. Build and static checks

1. `npm run test --workspace=frontend`
2. `npm run build --workspace=frontend`
3. `npm run lint --workspace=frontend`

## Migration Strategy

Use incremental PR-sized slices to avoid destabilization:

1. PR 1: scaffolding + guardrails + settings constants/types + domain hooks (no UI split yet)
2. PR 2: settings tab components + a11y tab semantics + thin composition layer
3. PR 3: typed shared search hooks + runs page adoption
4. PR 4: run-detail/product-detail adoption + column factory extraction
5. PR 5: query cleanup + error normalization + invalidation tests + final docs sync

Each PR must preserve behavior and include tests for the moved logic.

## Acceptance Criteria

1. No overloaded route file contains business logic-heavy helper blocks.
2. `settings-page.tsx` only composes sections and consumes a page-level view-model hook.
3. Feature folders include dedicated `types`, `constants`, `hooks` (and `enums` if needed).
4. Cross-feature reusable logic is in `shared/*`, not duplicated.
5. Tab accessibility meets expected keyboard/screen-reader semantics.
6. Query strategy is simplified (no redundant admin categories fetch path unless justified).
7. Frontend tests/build/lint pass after each migration slice.

## Risks and Controls

Risk: accidental behavior regression during extraction.  
Control: snapshot-equivalent integration tests for routes before and after refactor.

Risk: over-abstraction early.  
Control: only extract logic used in at least two places or clearly complex enough to justify a hook.

Risk: naming churn and developer confusion mid-refactor.  
Control: document conventions in README and use predictable file naming (`use-*`, `*.constants.ts`, `*.types.ts`).

Risk: route-search generic hooks become loosely typed and silently unsafe.  
Control: require route-search hook type tests and disallow `any` in shared hooks.

## Immediate Next Step

Start with **Workstream B (Settings Refactor)**, since it has the largest readability and maintainability payoff with minimal external coupling.
