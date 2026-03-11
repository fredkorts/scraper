# HEADER_PRODUCT_QUICK_SEARCH_IMPLEMENTATION.md

## Status

Implemented on March 11, 2026.

Backend DB-backed verification is environment-dependent and currently blocked when local Postgres is unavailable.

## Summary

Introduce a minimal header product quick-search experience, available globally across the authenticated app shell, that starts as a magnifier icon button and expands into a full-width search input. As the user types, show a compact floating result panel directly below the input. Each result row is clickable and opens Product Detail.

## Goals

1. Reduce friction to jump from dashboard context to product detail.
2. Keep the header visually minimal by default.
3. Follow existing frontend architecture (TanStack Router, TanStack Query, runtime schema validation, shared primitives).
4. Preserve access control boundaries so users only see products within allowed scope.
5. Deliver a keyboard-first, screen-reader friendly interaction.
6. Avoid polluting URL/history for ephemeral header search state.
7. Provide relevant matching on both product title and category text.

## Non-Goals

1. Building a full search results page in this iteration.
2. Full-text indexing rollout or fuzzy ranking infrastructure.
3. Search across runs, categories, and users in one endpoint.
4. Replacing existing table-level search filters.

## Architecture Audit (Current State)

1. Header composition is owned by [app-layout.tsx](/Users/fredkorts/Documents/Development/Personal Projects/scraper/frontend/src/routes/app-layout.tsx), so adding quick search there is structurally correct and avoids duplicate per-route implementations.
2. Product detail route already exists (`/app/products/$productId`), so no new detail route is needed.
3. Frontend currently has no product search query endpoint wired in `apiEndpoints`.
4. Backend products routes currently expose only:
    - `GET /api/products/:id`
    - `GET /api/products/:id/history`
5. Existing access scope model in product services is robust and should be reused for search authorization.
6. Query layer already supports cancellation (`signal`) and `keepPreviousData`; this should be reused to prevent stale-result flicker.

## UX Specification

1. Default header state:
    - show icon-only search trigger (`aria-label="Open product search"`).
    - no visible input or panel.
2. Expanded state:
    - input appears inline in header center area.
    - input receives focus immediately.
    - minimal chrome: subtle border/surface, no heavy framing.
3. Typing behavior:
    - debounce at 250-300ms.
    - fetch only when normalized query length is at least 2.
4. Results panel:
    - anchored under input.
    - max 8 rows, scrollable if needed.
    - each row includes image thumbnail, product title, category label.
    - each row is clickable and keyboard-selectable.
    - matched text can come from product name and/or category label.
5. Interaction model:
    - `ArrowDown`/`ArrowUp` navigates row highlight.
    - `Enter` opens highlighted result.
    - `Escape` closes panel; if query is empty, collapse back to icon state.
    - click outside closes panel.
6. States:
    - loading: compact spinner row.
    - empty: "No matching products."
    - error: short retryable message.
7. Input-to-panel click behavior:
    - prevent blur-race that closes panel before row click is handled.
    - prefer `onMouseDown`/`onPointerDown` handling on rows before focus loss.

## Accessibility Requirements

1. Implement combobox semantics:
    - input uses `role="combobox"`.
    - `aria-expanded`, `aria-controls`, `aria-activedescendant`.
2. Results list:
    - `role="listbox"` and each item `role="option"`.
3. Trigger/input labels:
    - icon trigger has explicit `aria-label`.
    - input has explicit label (visually hidden label is acceptable).
4. Focus behavior:
    - opening moves focus to input.
    - closing returns focus to trigger.
    - no keyboard trap.
5. Hit area:
    - trigger target at least 44x44.
6. Screen reader announcements:
    - live region for count updates ("5 results").

## API Contract (New)

1. Endpoint:
    - `GET /api/products/search`
2. Query params:
    - `query: string` (trimmed, min 2, max 100)
    - `limit?: number` (default 8, max 10)
3. Response shape:
    - `{ items: Array<{ id, name, imageUrl, categoryName }> }`
    - `categoryName` must be deterministic for multi-category products.
4. Security:
    - authenticated-only.
    - role-aware scoping:
        - admin: all accessible active categories
        - non-admin: only products within user-tracked active category scope
5. Protection:
    - apply read limiter tuned for autocomplete traffic.
6. Query semantics:
    - case-insensitive tokenized `contains` matching on product name and category label text.
    - token logic uses `AND` across tokens.
    - result set is deduplicated by product id before applying final limit.
    - category label selection for a product:
        - if query matched one or more associated category names, use the first matched category name in deterministic alphabetical order.
        - otherwise use the first associated accessible active category name in deterministic alphabetical order.
    - deterministic secondary ordering by `lastSeenAt DESC`, then `id DESC`.
    - enforce hard `LIMIT` server-side.
7. Response headers:
    - set `Cache-Control: private, no-store` for user-scoped search responses.

## Frontend Implementation Plan

## Phase 1: Backend-first contracts and tests

1. Add products search schema and route wiring in backend.
2. Add controller/service query implementation with strict scope filtering.
3. Add backend tests:
    - unauthenticated rejected
    - non-admin scope filtering
    - admin breadth behavior
    - validation and limit clamping
    - rate-limit behavior returns 429 when threshold exceeded
    - cache header contract is `private, no-store`
    - multi-category products are deduplicated and return deterministic `categoryName`
4. Add shared contract type updates in `shared/src/index.ts` if needed.

## Phase 2: Frontend query layer

1. Extend [endpoints.ts](/Users/fredkorts/Documents/Development/Personal Projects/scraper/frontend/src/lib/api/endpoints.ts) with `products.search`.
2. Add query key:
    - `queryKeys.products.search(params)`.
3. Add runtime schemas and typed query options/hook:
    - `productQuickSearchResponseSchema`
    - `productQuickSearchQueryOptions`
    - `useProductQuickSearchQuery`
4. Ensure queryFn forwards `signal`.
5. Add query normalization utility:
    - trim, collapse whitespace, clamp max length 100.
6. Use ephemeral component state (not route search params) for quick search query.

## Phase 3: UI components

1. Add feature-level component:
    - `frontend/src/features/products/components/header-quick-search/HeaderProductQuickSearch.tsx`
    - local CSS module and types.
2. Add row subcomponent:
    - `QuickSearchResultRow` with image/title/category.
3. Reuse existing shared primitives:
    - `AppButton` for trigger
    - `AppInput` for expanded field
4. Keep component self-contained for open/close, keyboard nav, and panel positioning.
5. Component behavior contract:
    - close panel on route transition.
    - close panel on outside pointer down.
    - keep panel open while interacting with result list.
    - coordinate with account menu so only one header overlay is open at a time.

## Phase 4: AppLayout integration

1. Mount `HeaderProductQuickSearch` inside header between logo and menu actions.
2. Update [app-layout.module.scss](/Users/fredkorts/Documents/Development/Personal Projects/scraper/frontend/src/routes/app-layout.module.scss):
    - dedicated flexible center slot for search
    - preserve current right-side menu alignment
    - responsive collapse behavior for narrow widths
3. Keep feature available on all authenticated `/app` routes (global app-shell behavior).
4. Ensure no cumulative layout shift from collapsed to expanded states on desktop and mobile breakpoints.

## Phase 5: Frontend test coverage

1. Component tests:
    - expand/collapse behavior
    - debounce + query trigger
    - loading/empty/error rendering
    - keyboard navigation and enter selection
    - escape and outside-click close
2. Route integration tests:
    - header search visible in authenticated shell
    - selecting result navigates to `/app/products/$productId`
    - feature remains available on non-dashboard authenticated routes
    - result row shows backend-provided deterministic category label for multi-category products
3. Accessibility tests:
    - combobox/listbox roles and labels
    - focus return to trigger on close
4. Interaction edge-case tests:
    - clicking a result does not get canceled by input blur.
    - route navigation closes panel and resets transient state.
    - escape closes panel first, second escape collapses empty input state.
    - opening account menu closes quick-search panel, and vice versa.
5. Error-path tests:
    - 429 from search endpoint renders a non-blocking inline error row/message in the results panel.

## Phase 6: rollout and guardrails

1. Keep feature flag available for safe rollout:
    - `PRODUCT_QUICK_SEARCH_ENABLED` (frontend capability gate)
2. Add lightweight telemetry hooks (optional if already available):
    - open events
    - query events (without storing query text)
    - result click-through
3. Performance guardrail:
    - target p95 search response under 250ms for expected production dataset.
    - if breached, create follow-up task for index/FTS optimization.

## React Developer Audit (Strict)

## Findings

1. Risk: Duplicate debounce layers can cause lag.
    - Fix: debounce only in `HeaderProductQuickSearch`, never in input primitive.
2. Risk: Stale query responses override newer query.
    - Fix: forward `signal` in queryFn and rely on TanStack cancellation.
3. Risk: Panel layering clipped by header/container overflow.
    - Fix: enforce visible overflow in header shell or render panel in anchored portal.
4. Risk: Trigger-to-input animation causes layout shift on small screens.
    - Fix: reserve center search container width with responsive min/max clamps.
5. Risk: Search result rows become nested interactive elements.
    - Fix: each row is a single interactive element (button or link), no nested button/link.
6. Risk: Scope leakage via category label or hidden products.
    - Fix: scope filtering in service query, not post-processing in controller.
7. Risk: API abuse from rapid typing.
    - Fix: min query length, debounce, and endpoint rate limit.
8. Risk: URL/history noise from per-keystroke updates.
    - Fix: keep header search state local and ephemeral; do not sync to route search params.
9. Risk: nondeterministic result ordering causing visual jumpiness.
    - Fix: define deterministic backend ordering with a stable tie-breaker.
10. Risk: result click lost due to blur/outside handlers.

- Fix: handle pointer-down ordering and outside-click logic carefully.

11. Risk: conflicting header overlays (quick search and menu) degrade usability.

- Fix: enforce one-open-at-a-time rule.

12. Risk: personalized search cached by intermediaries.

- Fix: explicitly return `Cache-Control: private, no-store`.

13. Risk: join-based duplicates or unstable category labels for products in multiple categories.

- Fix: dedupe by product id and define deterministic `categoryName` selection rules.

## Audit Patch Decisions Applied in Plan

1. Backend-first test gate added in Phase 1.
2. Explicit cancellation requirement added in Phase 2.
3. Layout/overflow requirement added in Phase 4.
4. Accessibility/interaction tests expanded in Phase 5.
5. Safe rollout flag added in Phase 6.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run test --workspace=backend`
3. `npm run lint --workspace=frontend`
4. `npm run test --workspace=frontend`
5. `npm run build --workspace=frontend`

## Acceptance Criteria

1. User can open quick search from header with icon-only trigger.
2. Input expands inline and fetches results while typing.
3. Result panel appears under input with image/title/category rows.
4. Clicking or pressing Enter on a result opens product detail.
5. Non-admin users never see out-of-scope products.
6. Keyboard and screen-reader behavior passes accessibility checks.
7. Backend and frontend tests for the feature pass.
8. Header layout remains stable during search expand/collapse transitions.
9. Quick search is available on all authenticated app-shell routes.
10. Search matching includes category label text in addition to product title.
