# Changes Explorer Filter UX Implementation

## Status

Planned (March 11, 2026).

## UX Evaluation (Current State)

The current filter area is functional but visually crowded. From a UX perspective, the main problems are:

1. Weak hierarchy:
    - Search appears as one control among many, instead of the primary discovery action.
2. High cognitive load:
    - Six controls plus reset are presented with equal visual weight.
3. Information duplication:
    - Filters are shown in controls and repeated again in a large summary block.
4. Scan inefficiency:
    - Users must parse a long horizontal row before understanding what is currently active.
5. Responsiveness risk:
    - On narrower widths, wrapping creates inconsistent grouping and can hide intent.

## UX Goals

1. Make search the primary control.
2. Reduce initial visual noise while keeping full filter power.
3. Keep active filter state visible but compact.
4. Preserve accessibility and keyboard flow.
5. Reuse existing shared components and patterns.

## Proposed Interaction Model

### 1) Two-tier filter system

Primary row (always visible):

1. Search (left, flexible width, dominant).
2. Change type (right).
3. Category (right).
4. Reset filters (right, secondary emphasis).

Advanced row (collapsible/toggle, hidden by default):

1. Preorder
2. Window
3. Page size

Notes:

1. Keep advanced row open automatically when any advanced filter is active.
2. Show a compact “N active filters” indicator near the advanced toggle.

### 1.1 Locked behavior contract

1. URL-backed filter semantics remain unchanged:
    - `changeType`
    - `categoryId`
    - `preorder`
    - `windowDays`
    - `pageSize`
    - `query`
2. Advanced-row expand/collapse is UI-only state (not URL-backed).
3. Default advanced-row state:
    - collapsed when all advanced filters are at default values
    - expanded when any advanced filter is non-default
4. Reset behavior remains global:
    - `Reset all filters` restores the same defaults used by `defaultChangesListSearch`
    - pagination resets to page 1
5. On initial load and browser back/forward navigation:
    - UI must derive expanded/collapsed state from current URL filter values.

### 2) Replace large context summary block

1. Remove the current multiline context summary card.
2. Replace with compact active filter chips/tags:
    - `Change type: New product`
    - `Category: All tracked categories`
    - `Window: Last 7 days`
    - etc.
3. Each chip is removable in-scope (not optional), except chips representing defaults that are hidden.
4. Chip removal mapping (deterministic):
    - `Change type` chip remove -> `changeType: undefined`, `page: 1`
    - `Category` chip remove -> `categoryId: undefined`, `page: 1`
    - `Preorder` chip remove -> `preorder: defaultChangesListSearch.preorder`, `page: 1`
    - `Window` chip remove -> `windowDays: defaultChangesListSearch.windowDays`, `page: 1`
    - `Search` chip remove -> `query: undefined`, `page: 1`
    - `Page size` chip remove -> `pageSize: defaultChangesListSearch.pageSize`, `page: 1`
5. Sorting remains shown as compact text (non-removable informational item).

### 3) Responsive behavior

Desktop:

1. Search anchored left.
2. Primary non-search controls grouped to the right.

Tablet/mobile:

1. Search full width in first row.
2. Primary selects wrap into 2-column then 1-column grid.
3. Advanced filters remain collapsible to avoid vertical overload.

## Accessibility Requirements

1. Keep explicit labels for every control.
2. Advanced filter toggle must expose:
    - `aria-expanded`
    - `aria-controls`
3. Keep tab order logical:
    - search -> primary filters -> advanced toggle -> advanced filters.
4. Preserve existing `TableSearchInput` clear action labels.
5. Ensure chip text has sufficient contrast in both themes.
6. Collapsed advanced row must not be keyboard-focusable:
    - hidden controls are removed from tab order and accessibility tree.
7. Chip remove actions must have explicit accessible names:
    - e.g., `Remove filter Category: Board Games`.

## Architecture / Component Plan

## Reuse first

1. `TableSearchInput`
2. `AppSelect`
3. `AppButton`
4. Existing spacing/tokens in shared SCSS

## New UI pieces (small and local)

1. `ChangesFilterBar` (primary + advanced layout orchestration)
2. `ChangesActiveFilterChips` (compact active state display)
3. `AdvancedFiltersToggle` behavior is owned by `ChangesFilterBar` (no separate component in this slice).

All of these should live under:

1. `frontend/src/features/runs/views/changes-page/components/`

## Concrete Implementation Steps

## Phase 1: Layout and interaction structure refactor (filter semantics unchanged)

1. Create `ChangesFilterBar` and move existing controls into primary/advanced groups.
2. Wire it to existing URL-backed search state and callbacks.
3. Keep existing filter semantics exactly unchanged (see locked behavior contract).
4. Keep reset behavior unchanged (global reset to defaults).
5. Implement advanced-row expanded state as local UI state derived from URL filter values.

Target files:

1. `frontend/src/features/runs/views/changes-page/ChangesPageView.tsx`
2. `frontend/src/features/runs/views/changes-page/components/ChangesFilterBar.tsx` (new)
3. `frontend/src/features/runs/views/changes-page/components/changes-filter-bar.module.scss` (new)

## Phase 2: Compact active-state display

1. Remove large summary card block in `ChangesPageView`.
2. Add `ChangesActiveFilterChips` below filter bar.
3. Show only non-default filters by default.
4. Keep sorting summary visible (single compact line).
5. Implement deterministic chip removal mapping for each filter key.

Target files:

1. `frontend/src/features/runs/views/changes-page/ChangesPageView.tsx`
2. `frontend/src/features/runs/views/changes-page/components/ChangesActiveFilterChips.tsx` (new)
3. `frontend/src/features/runs/views/changes-page/components/changes-active-filter-chips.module.scss` (new)

## Phase 3: Responsive and accessibility polish

1. Add breakpoints for row-to-grid collapse.
2. Add advanced toggle semantics (`aria-expanded`, `aria-controls`).
3. Verify keyboard focus order and visible focus states.
4. Validate long category labels and overflow handling.
5. Ensure collapsed advanced controls are not reachable by keyboard navigation.

## Phase 4: Tests and verification

1. Update/add route tests for:
    - advanced row toggle behavior
    - auto-expand advanced row when advanced filters are active
    - collapse advanced row when advanced filters return to defaults
    - persistence of active filters in URL
    - initial render/back-forward derives expanded state from URL values
    - reset behavior across both primary and advanced controls
    - chip removal updates correct query key/value and resets page to 1
2. Add accessibility assertions for:
    - advanced toggle ARIA
    - collapsed controls are not focusable
    - chip remove buttons have explicit accessible names
    - all labels and interactive controls discoverable by role/name
3. Run full frontend checks.

Commands:

1. `npm run lint --workspace=frontend`
2. `npm run test --workspace=frontend`
3. `npm run build --workspace=frontend`

## Acceptance Criteria

1. Search is visually and structurally primary.
2. Primary filter row is not crowded at desktop widths.
3. Advanced filters are accessible but not always in the way.
4. Active filter state is readable without a large verbose summary card.
5. No regressions in URL-backed filtering behavior.
6. Keyboard and screen reader behavior remains correct.
7. Chip removals produce deterministic URL updates and reset pagination.
8. Advanced-row expanded state is consistent on refresh and browser back/forward navigation.

## Risks and Mitigations

1. Risk: Users miss advanced filters.
    - Mitigation: show active-count indicator and auto-open when advanced filters are active.
2. Risk: Too much component splitting for one view.
    - Mitigation: keep new components local to `changes-page` view; avoid global abstractions.
3. Risk: Visual inconsistency with other table views.
    - Mitigation: keep shared controls; only reorganize layout and hierarchy.
4. Risk: pattern drift across table-heavy pages.
    - Mitigation: if this release validates UX improvement, promote this filter layout pattern into shared table-filter guidelines and apply incrementally to other relevant views.
