# Styling Architecture Implementation Plan

## Status

Implemented as a core architecture cleanup pass.

Completed in this pass:

- token library expanded in `frontend/src/styles/abstracts/_variables.scss`
- shared responsive mixins expanded in `frontend/src/styles/abstracts/_mixins.scss`
- shared form, status, empty/error, and table primitives added under `frontend/src/styles/components/`
- shared page container mixin added under `frontend/src/styles/layout/`
- existing Phase 4 route, auth, and table modules refactored to consume shared tokens and primitives
- frontend `build`, `lint`, and `test` all pass after the cleanup

Still optional for later refinement:

- split `scrape-views.module.scss` into smaller route-specific modules if Phase 5 growth justifies it
- add further layout partials such as `_grids.scss` and `_sections.scss` if reuse becomes real rather than speculative

## 1. Scope

This plan covers the `Phase 4 Styling Architecture (SCSS + CSS Modules)` section in [REQUIREMENTS.md](/Users/fredkorts/Documents/Development/Personal Projects/scraper/REQUIREMENTS.md).

It is specifically about how we will structure, scale, and govern frontend styling for the authenticated dashboard now that Phase 4 views exist:

- dashboard home
- runs list
- run detail
- product detail / price history

This is not a redesign plan. It is a styling architecture plan for making the dashboard consistent, maintainable, accessible, and safe to extend through later phases.

## 2. Current Baseline

The project already has a good foundation in place:

- `frontend/src/styles/abstracts/_variables.scss`
- `frontend/src/styles/abstracts/_mixins.scss`
- `frontend/src/styles/abstracts/_functions.scss`
- `frontend/src/styles/base/_reset.scss`
- `frontend/src/styles/base/_typography.scss`
- `frontend/src/styles/components/_buttons.scss`
- `frontend/src/styles/components/_cards.scss`
- `frontend/src/styles/layout/_app-shell.scss`
- `frontend/src/styles/main.scss`

The app also already uses route/component-level CSS Modules:

- `frontend/src/routes/app-layout.module.scss`
- `frontend/src/routes/scrape-views.module.scss`
- `frontend/src/routes/Page.module.scss`
- `frontend/src/features/auth/AuthForm.module.scss`
- `frontend/src/components/data-table/DataTable.module.scss`

So this phase is not about inventing a styling system from zero. It is about tightening the rules and expanding the architecture cleanly.

## 3. Goals

1. Keep all dashboard styles token-driven and predictable.
2. Prevent style duplication as more views and settings screens are added.
3. Separate global foundation styles from local component styles clearly.
4. Keep accessibility and responsive behavior as first-class styling concerns.
5. Make it obvious where a new style should live before Phase 5 expands the dashboard.
6. Perform a deliberate cleanup pass over the existing `frontend/` styles so already-built screens follow the same architectural rules.

## 3.1 Scope Guardrails

This phase is a styling architecture cleanup, not a dashboard redesign.

Guardrails:

- do not intentionally restyle the dashboard’s visual identity in this phase
- do not rewrite layouts unless the current implementation is clearly inconsistent, duplicated, or inaccessible
- prefer token replacement and primitive extraction over large selector rewrites
- do not split modules just for neatness; split only when duplication or file size makes maintenance meaningfully worse
- preserve current behavior and visual hierarchy unless a documented accessibility or consistency problem requires change

## 4. Core Styling Principles

### 4.1 Tokens First

All reusable visual decisions should come from shared tokens before they appear in local modules.

Use tokens for:

- colors
- spacing
- typography
- radii
- shadows
- transitions
- z-index and layering if needed later

Do not hardcode values in CSS Modules when a token should exist instead.

Cleanup rule for existing code:

- review current `*.module.scss` and global SCSS files and replace hardcoded colors, spacing, radii, shadows, typography sizes, and transitions with existing tokens wherever possible
- only add a new token when no current token expresses the intent cleanly

### 4.2 CSS Modules For Local Composition

CSS Modules remain the default for route- and component-level styling.

Use CSS Modules for:

- view layout composition
- local spacing between sections
- component-specific states
- visual variants that are only meaningful inside one feature area

Do not move feature-specific layout rules into the global layer unless they are truly reused across multiple screens.

Cleanup rule for existing code:

- keep local one-off layout rules in CSS Modules
- extract only repeated patterns, not every selector that happens to look similar

### 4.3 Global SCSS For Foundation, Not Page Styling

The global SCSS layer should define:

- reset and typography defaults
- tokens
- mixins/functions
- a small set of cross-app primitives
- layout scaffolding

It should not become a dumping ground for page-specific selectors.

Cleanup rule for existing code:

- if an existing local style is repeated across multiple screens, move the repeated primitive into the global layer and leave screen-specific composition local

### 4.4 Primitive Consumption Rule

The plan must define how shared primitives are consumed inside a CSS Modules codebase.

Rule:

- CSS Modules remain the dominant styling mechanism
- shared primitives should be exposed primarily through Sass mixins, placeholders, or narrowly scoped global element/class patterns
- route and component modules should consume those primitives rather than bypassing CSS Modules entirely

Allowed global primitives:

- baseline element styles that truly apply app-wide
- a very small set of cross-app primitive selectors where global usage is intentional and documented

Disallowed pattern:

- adding many generic global utility classes and gradually bypassing CSS Modules

Decision rule:

- if the styling concern is structural or repeated visual behavior, provide a shared primitive API for modules to consume
- if the concern is local composition, keep it inside the module

## 5. Target Folder Responsibilities

### 5.1 `frontend/src/styles/abstracts/`

Purpose:

- design tokens
- Sass helpers
- shared mixins

Target files:

- `_variables.scss`
- `_mixins.scss`
- `_functions.scss`
- optional future additions:
  - `_breakpoints.scss`
  - `_motion.scss`

Implementation rules:

- `:root` remains the source of CSS custom properties
- dark mode overrides stay here, not inside feature modules
- helper mixins should stay small and composable

### 5.2 `frontend/src/styles/base/`

Purpose:

- browser normalization
- app-wide text defaults
- element-level baseline behavior

Target files:

- `_reset.scss`
- `_typography.scss`
- optional future additions:
  - `_accessibility.scss`

Implementation rules:

- only set defaults that should apply everywhere
- do not add opinionated feature styling here

### 5.3 `frontend/src/styles/components/`

Purpose:

- reusable cross-feature UI primitives

Current examples:

- `_buttons.scss`
- `_cards.scss`

Recommended additions:

- `_forms.scss`
- `_status-badges.scss`
- `_tables.scss`
- `_empty-states.scss`

Implementation rules:

- these files define shared primitive classes or element rules only
- they must consume tokens only
- they should not encode one page’s bespoke layout

Forms ownership rule:

- form primitives belong in `components/_forms.scss`
- `base/` should only contain browser-default normalization and broad element-level defaults
- do not create a second `_forms.scss` in `base/` unless it is strictly limited to normalization concerns and clearly documented as such

### 5.4 `frontend/src/styles/layout/`

Purpose:

- shell and structural page scaffolding

Current example:

- `_app-shell.scss`

Recommended additions:

- `_containers.scss`
- `_grids.scss`
- `_sections.scss`

Implementation rules:

- layout files define reusable structural patterns
- view modules can compose them, but should not duplicate them repeatedly

## 6. Recommended Next Styling Additions

These are the highest-value additions to the global styling layer.

### 6.1 Expand Tokens

Add missing token groups:

- `--color-success`
- `--color-warning`
- `--color-info`
- `--shadow-sm`
- `--shadow-lg`
- `--radius-lg`
- `--font-size-xl`
- `--line-height-tight`
- `--transition-base`
- `--transition-slow`

Why:

- current Phase 4 views already use status-heavy UI
- Phase 5 settings screens will introduce more form, status, and feedback patterns

### 6.2 Add Shared Form Primitives

Move common form-control styling into a global primitive layer.

Recommended primitive targets:

- text inputs
- selects
- textareas
- checkbox/radio wrappers
- labels
- hint/error text

Why:

- the auth forms and product-history controls are already repeating form patterns
- Phase 5 settings UI will expand this further

### 6.3 Add Shared Status Primitive

Create a shared status badge primitive instead of repeating route-local badge styling.

Status variants should support at least:

- success / completed
- danger / failed
- neutral / pending
- muted / informational

Why:

- run status, stock state, and future channel/account status all need a common treatment

### 6.4 Add Shared Empty/Error State Primitive

Create a shared styling approach for:

- loading placeholders
- empty states
- warning states
- error panels

Why:

- these patterns already repeat across dashboard home, runs, run detail, and product history

## 6.5 Existing Frontend Cleanup Pass

This plan explicitly includes a cleanup pass over the existing frontend styles, not just new styling rules for future work.

Target scope:

- `frontend/src/routes/**/*.module.scss`
- `frontend/src/components/**/*.module.scss`
- `frontend/src/features/**/*.module.scss`
- `frontend/src/styles/**/*.scss`

Required actions:

- replace hardcoded values with existing CSS custom properties where suitable
- replace repeated focus handling with shared mixins
- replace repeated container behavior with shared layout mixins where suitable
- replace repeated button/card/control/state styling with shared primitives when the pattern is clearly reused
- leave deliberate one-off composition rules local to the feature module

Decision rule:

- use an existing token first
- create a new token second
- keep a hardcoded value only when it is truly one-off and does not represent reusable design intent

Examples of what should be cleaned up:

- duplicated border radii that already match `--radius-sm` or `--radius-md`
- repeated colors that already match `--color-border`, `--color-text-muted`, `--color-danger`, or `--color-primary`
- repeated transition timings that already match `--transition-fast`
- repeated focus outlines that should use `@include focus-ring`
- repeated width/container logic that should use shared responsive-container helpers or future breakpoint mixins

## 7. View-Level Styling Strategy

### 7.1 `scrape-views.module.scss`

This file is currently carrying multiple Phase 4 screens. That is acceptable for the current size, but it should not become a permanent mega-module.

Recommended direction:

- keep shared Phase 4 dashboard layout patterns here short-term
- split it once Phase 5 adds more screens

Recommended future split:

- `dashboard-home.module.scss`
- `runs-page.module.scss`
- `run-detail-page.module.scss`
- `product-detail-page.module.scss`
- `shared-dashboard.module.scss`

Decision rule:

- if a style block is only used by one screen, move it to that screen’s module
- if it is reused by three or more dashboard screens, promote it to shared dashboard styling or a global primitive

### 7.2 Route Modules Stay Thin

Each route module should mostly do:

- composition
- spacing
- local arrangement

They should not redefine tokens, reset elements, or recreate common form/button/card patterns.

## 8. Accessibility Requirements

Styling must reinforce accessibility, not work against it.

Required rules:

- focus-visible states must be obvious and token-driven
- status meaning cannot rely on color alone
- disabled controls must remain visually distinct but readable
- contrast must remain valid in both light and dark mode
- responsive layouts must preserve reading order
- tables must remain horizontally usable on smaller screens without destroying semantics

Recommended additions:

- centralize focus treatment in a shared form/accessibility partial
- define token-based outlines and interaction states once

## 9. Responsive Strategy

Phase 4 screens already have multi-panel layouts and data tables. Responsive behavior should be deliberate.

Rules:

- use a small, named breakpoint strategy instead of ad hoc media queries
- stack multi-column layouts into a single readable flow on smaller screens
- keep control groups wrapping cleanly without collapsing label clarity
- avoid fixed widths for dashboard cards where grid `minmax(...)` patterns work

Recommended mixin additions:

- `@mixin mq-sm`
- `@mixin mq-md`
- `@mixin mq-lg`

Do not spread raw breakpoint values through many files once these mixins exist.

## 10. Implementation Phases

### Phase A: Audit and Token Expansion

- audit all existing frontend style files before adding new architecture layers
- review current hardcoded values across `*.module.scss`
- identify repeated spacing, radius, and status colors
- replace hardcoded values with existing tokens immediately where a match already exists
- add missing tokens to `_variables.scss`

Acceptance criteria:

- every reused value that represents design intent exists as a token
- obvious existing hardcoded values that already map to current tokens are removed
- no visual redesign decisions are introduced during the audit

### Phase B: Shared Primitive Extraction

- add shared form primitives
- add shared status badge primitives
- add shared empty/error state primitives
- replace existing duplicated local implementations with the shared primitive version where appropriate

Acceptance criteria:

- route modules stop reimplementing the same control and state patterns

### Phase C: Phase 4 Module Cleanup

- reduce duplication inside `scrape-views.module.scss`
- move single-screen rules closer to the relevant screen if needed
- keep shared dashboard rules clearly named

Acceptance criteria:

- the file becomes easier to scan and reason about
- module splitting only happens where duplication or maintenance cost justifies it

### Phase D: Responsive and Accessibility Hardening

- unify breakpoint usage
- confirm focus states and contrast across views
- verify table, chart, and filter layouts on mobile widths

Acceptance criteria:

- dashboard views remain usable on narrow screens and keyboard navigation remains clear

## 11. Testing and Review Expectations

This styling phase is mostly architectural, but it still needs verification.

Required checks:

- `npm run build --workspace=frontend`
- `npm run lint --workspace=frontend`
- `npm run test --workspace=frontend`

Required review pass:

- inspect all existing frontend style files touched by the cleanup
- confirm token replacement did not introduce visual regressions
- confirm any remaining hardcoded values are intentional and justified

Manual review checklist:

- dashboard home on desktop and mobile
- runs list with wrapped filters and table overflow
- run detail with long content sections
- product detail/history with chart and controls in narrow layouts
- auth forms after shared form primitives are introduced
- dark mode token behavior

## 12. Risks

### Risk: Over-globalizing styles

Impact:

- local feature styling becomes harder to reason about

Mitigation:

- keep global styles limited to tokens, primitives, and layout scaffolds

### Risk: Token sprawl

Impact:

- token names become inconsistent and hard to choose from

Mitigation:

- add tokens only when they represent real repeated design intent

### Risk: One giant dashboard SCSS module

Impact:

- Phase 5 screens become harder to maintain

Mitigation:

- split route-specific styles before the next dashboard phase gets large

## 13. Deliverables

- expanded token library
- shared form primitives
- shared status and state primitives
- cleaned-up Phase 4 route styling structure
- documented breakpoint and responsive strategy
- verified accessibility-oriented interaction states
