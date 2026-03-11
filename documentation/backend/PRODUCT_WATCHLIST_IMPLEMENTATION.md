# Product Watchlist Implementation Plan

## Status

Implemented (code complete).

Verification status:

1. `lint`/`build`/`typecheck` pass for `shared`, `backend`, and `frontend`.
2. Frontend test suite passes.
3. Backend tests are DB-backed and require a running Postgres test DB (`TEST_DATABASE_URL`); they are blocked in environments without local DB connectivity.

## Summary

Add product-level watch tracking so users can explicitly watch individual products, surface watch state in protected scrape views, and prioritize watched-product changes in notification emails.

This extends the current category-subscription model without replacing it.

## Locked Product Decisions

1. Untracking a category must auto-disable watched products in that category.
2. Plan capacity must be shared:
    1. one active category subscription = one slot
    2. one active watched product = one slot
    3. total active slots (`categories + watched products`) must respect role limits.
3. Product watch action uses `AppButton` with an eye icon in Product Detail.
4. Watched products in run detail tables use a shared star badge component built on Ant Design `Badge`.
5. Emails must show watched-product changes in a dedicated top section.
6. Unwatch API contract is canonical and singular:
    1. `DELETE /api/tracked-products/by-product/:productId`.
7. Watchlist capability is feature-gated on both backend and frontend.
8. Delivery-item watched snapshots are immutable per delivery once created.
9. Watched badge source of truth in run/detail/change payloads is server-provided `isWatched` for the current user.
10. Product Detail response includes watch state directly (`isWatched` and optional `trackedProductId`), so no separate initial watch-state query is required.
11. Frontend capability source of truth is `GET /api/auth/me` field `capabilities.productWatchlist`; missing field must default to `false` (fail-closed).

## Architecture Fit (Current System)

1. Current access model is category-scoped for `free` and `paid`, global for `admin`.
2. Current change pipeline is canonical:
    1. `change_items` are run-level truth
    2. `notification_deliveries` are per-user send-state truth.
3. Product watchlist must be modeled as user preference + derived email/view highlighting on top of canonical change data.

## Key Decision: Run-Time vs Send-Time Watch Resolution

We will resolve watched-product highlighting at **send time** with a persisted audit snapshot.

Why:

1. Digest delivery can happen hours later; users expect latest watch settings to apply.
2. It keeps behavior intuitive when users quickly unwatch noisy products.
3. We preserve auditability by storing whether each highlighted item was watched at send time.

Implementation consequence:

1. add `notification_delivery_items` (or equivalent) for per-delivery item metadata, including `isWatchedAtSend`.

## UX Audit: Risks and Mitigations

### 1. Eye icon ambiguity

Risk:

1. Eye can be interpreted as "view" instead of "watch."

Mitigation:

1. Label the button textually (`Watch product` / `Watching`), not icon-only.
2. Add explicit `aria-pressed` and `aria-label`.

### 2. Star badge semantic overload

Risk:

1. Star commonly means "favorite" rather than alert-priority.

Mitigation:

1. Add tooltip text `Watched product`.
2. Use one consistent placement in all tables (same column/cell region).

### 3. Plan-limit confusion

Risk:

1. Users may not understand why watching a product can fail even with category slots available.

Mitigation:

1. Settings summary must show combined usage:
    1. `Used slots: X / Limit`
    2. breakdown (`Categories: A`, `Products: B`).
2. Return and display explicit backend error: `tracking_limit_reached`.

### 4. Auto-disable on category untrack can feel surprising

Risk:

1. Silent removal erodes trust.

Mitigation:

1. On untrack category, return count/list of auto-disabled product watches.
2. Show notification:
    1. `Stopped tracking category`
    2. `N watched products disabled`.

### 5. Email overload

Risk:

1. Top watched section can duplicate long content already shown in grouped sections.

Mitigation:

1. Top section should be compact and capped.
2. Reuse existing section below for full details.
3. Add `+N more` behavior.

## System User Stories

1. As a user, I can watch a specific product from Product Detail so I can prioritize alerts for items I care about.
2. As a user, I can unwatch a product so it stops being prioritized in notifications.
3. As a user, I can recognize watched products in run-level tables via a consistent visual marker.
4. As a user, I can understand why watch actions fail when plan capacity is full.
5. As a user, when I untrack a category, I am informed which watched products were auto-disabled.
6. As a free user, I receive digest emails where watched-product changes are clearly prioritized at the top.
7. As a paid/admin user, I receive immediate emails where watched-product changes are clearly prioritized at the top.
8. As a non-admin user, I cannot watch products outside my active category access scope.
9. As an admin user, I can watch any product without category-scope restrictions.
10. As an operator, I can audit whether a change item was considered watched when email content was rendered.

## Edge Cases (Architectural)

1. User tries to watch the same product repeatedly from multiple views/tabs.
2. User untracks category A, but watched product belongs to category A and B, and B remains tracked.
3. User untracks category A and watched product is now inaccessible through all active categories.
4. User hits combined limit exactly (`categories + watched products == limit`) and attempts one more watch.
5. User is downgraded from paid to free while above new effective combined limit.
6. Product gets deleted/hidden/soft-inactive upstream but historical change items still reference it.
7. Digest send happens after watch/unwatch toggles changed several times.
8. Email retry path rerenders same delivery; watched top section must remain stable for that delivery.
9. Concurrent watch and unwatch requests arrive in rapid succession from multiple clients.
10. Notification delivery creation succeeds but delivery item snapshot creation partially fails.
11. Category untrack and digest send race on same user.
12. Admin manually views/operates on products across inaccessible categories for non-admin users.
13. Product appears in many categories and category membership changes over time.
14. Existing users with full category slots but zero watched products attempt watch action.
15. Frontend deployed ahead of backend flag enablement.
16. Cached older frontend session reading newer payload shape (and vice versa).

## Test-First Delivery Strategy (Locked)

No implementation code is added before failing tests exist for that slice.

## Phase 1: Contract and backend failing tests first

1. Add backend tests for:
    1. watch create/list/delete
    2. combined slot limit checks
    3. category untrack auto-disable behavior
    4. access-scope and 404 anti-enumeration behavior
    5. idempotent delivery-item snapshot writes.
2. Add shared contract tests/types for new payloads.
3. Only after tests fail for expected reasons, implement backend code.

## Phase 2: Notification failing tests first

1. Add template tests proving watched section ordering, capping, and plain-text/HTML parity.
2. Add notification-flow tests for immediate and digest with watch/unwatch timing scenarios.
3. Only after failures are confirmed, implement email pipeline changes.

## Phase 3: Frontend failing tests first

1. Add route/component tests for:
    1. Product Detail watch button behavior and accessibility
    2. watched badge rendering in run detail tables
    3. settings tracking usage breakdown and auto-disable feedback
    4. feature-flag disabled mode (watch controls hidden/disabled gracefully)
    5. mutation race behavior (rapid watch/unwatch yields last user intent).
2. Only after failures are confirmed, implement frontend components/hooks/UI wiring.

## Phase 4: End-to-end verification

1. Run full backend and frontend verification suites.
2. Validate migration + rollout checklist in a staging-like environment before production enablement.

## Data Model Changes

## New table: `user_tracked_products`

Columns:

1. `id` uuid PK
2. `user_id` uuid FK -> `users.id`
3. `product_id` uuid FK -> `products.id`
4. `is_active` boolean default `true`
5. `created_at` timestamp
6. `updated_at` timestamp
7. `deactivated_reason` nullable text (`manual_unwatch`, `category_untracked`, `product_inaccessible`)

Indexes/constraints:

1. unique (`user_id`, `product_id`)
2. index (`user_id`, `is_active`)
3. index (`product_id`, `is_active`)

## New table: `notification_delivery_items`

Purpose:

1. preserve per-delivery item snapshot and watched-at-send metadata.

Columns:

1. `id` uuid PK
2. `notification_delivery_id` uuid FK -> `notification_deliveries.id`
3. `change_item_id` uuid FK -> `change_items.id`
4. `is_watched_at_send` boolean default `false`
5. `created_at` timestamp

Constraints:

1. unique (`notification_delivery_id`, `change_item_id`)
2. index (`notification_delivery_id`)
3. index (`is_watched_at_send`)

## Backend Changes

## A) Services and contracts

Add product watch service:

1. `listTrackedProducts(userId, role)`
2. `trackProduct(userId, role, productId)`
3. `untrackProduct(userId, productId)`

Rules:

1. Non-admin users can only watch products visible through active category scope.
2. Combined limit enforcement uses active categories + active watched products.
3. `trackProduct` upserts active state for idempotency.

## B) Category untrack side effects

On category untrack:

1. find active watched products where visibility depended on that category and user no longer has access after untrack.
2. deactivate those watches with `deactivated_reason=category_untracked`.
3. return `autoDisabledWatchCount` in response payload.

## C) API routes

Add:

1. `GET /api/tracked-products`
2. `POST /api/tracked-products` `{ productId }`
3. `DELETE /api/tracked-products/by-product/:productId`

Update:

1. subscription delete response shape to include side-effect summary (`autoDisabledWatchCount`).

## D) Notification pipeline

Before sending each delivery:

1. load change items + watched-product ids for recipient at send time.
2. write `notification_delivery_items` rows with `is_watched_at_send`.
3. if `notification_delivery_items` already exist for the delivery, reuse them and do not recompute watch state.
4. render top "Watched products changed" section from rows flagged true.

Digest:

1. same behavior per delivery included in digest.
2. keep existing grouping sections after watched summary.

## E) Shared types

Update `shared/src/index.ts`:

1. new tracked-product interfaces and responses.
2. updated settings/subscription mutation response type for auto-disable summary.
3. add `isWatched` to relevant run/detail/change list product payloads used by watched badges.
4. add `isWatched` and optional `trackedProductId` to product detail payload (`GET /api/products/:id`).
5. add watchlist capability flag to auth-me payload:
    1. `capabilities.productWatchlist: boolean`.
6. runtime backward-compat contract:
    1. missing `capabilities.productWatchlist` is treated as `false` by frontend schema/parser.

## Frontend Changes

## A) Shared components

1. `TrackedProductBadge` (shared) based on Ant `Badge` + star icon.
2. Reuse in:
    1. run detail changes table
    2. run detail product snapshots table
    3. optionally changes explorer row cell (future-compatible, out of scope for first pass).

## B) Product detail watch action

In Product Detail:

1. add watch/unwatch button near critical actions.
2. use `AppButton` + eye icon.
3. reflect active state:
    1. `Watch product`
    2. `Watching`.
4. add optimistic UX with rollback on error and notification feedback.
5. mutation race handling:
    1. serialize per-product watch mutations or ignore stale mutation completions
    2. final UI state must reflect last user intent.
6. pre-disable action when combined capacity is exhausted, with explicit helper text.

## C) Settings updates

Tracking tab:

1. split into:
    1. tracked categories
    2. watched products.
2. usage card shows combined slot count and breakdown.
3. on category untrack, show post-action notification with auto-disabled product count.
4. watched-products subsection must define and implement explicit states:
    1. loading state
    2. empty state
    3. error state with retry action.

## D) Query/state

1. Add TanStack Query hooks for tracked products.
2. Invalidate product-watch queries after watch/unwatch.
3. Keep URL state unchanged (watch state is server state, not search state).
4. Gate watch UI with backend-provided capability flag.
5. Avoid client-side ad hoc joins for table badges where backend already provides `isWatched`.
6. lock invalidation/refetch matrix after watch/unwatch:
    1. `queryKeys.products.detail(productId)`
    2. `queryKeys.settings.trackedProducts()`
    3. `queryKeys.settings.subscriptions()`
    4. run-detail query key when current view renders watched badges
    5. changes-list query key when current view renders watched badges.
7. lock optimistic mutation behavior:
    1. optimistic Product Detail button state update
    2. rollback on failure
    3. stale mutation completion ignored if superseded by newer intent.

## Accessibility Requirements

1. Watch button must expose state with `aria-pressed`.
2. Badge must expose deterministic SR text in table cells:
    1. visible icon + visually hidden text `Watched product`
    2. tooltip is supplemental, not the primary accessible label.
3. Email HTML/text watched sections must preserve readable order and plain-text parity.

## Migration + Rollout

1. Add DB migration for new tables.
2. Deploy backend with write path behind feature flag `PRODUCT_WATCHLIST_ENABLED`.
3. Expose capability flag to frontend and default to disabled until backend feature is enabled.
4. Backfill is not required.
5. Enable frontend watch controls only when capability flag is true.
6. Monitor:
    1. watch create/delete error rates
    2. auto-disabled counts on category untrack
    3. email render/send errors.
    4. stale mutation conflict counts (if instrumented).

## Testing Plan

This section is execution-gated by the Test-First Delivery Strategy above.

## Backend tests

1. Product watch create/list/delete with RBAC scope.
2. Combined limit enforcement:
    1. categories + watched products share same slot pool.
3. Category untrack auto-disables now-inaccessible watches.
4. Email rendering:
    1. watched section appears at top when matches exist
    2. no watched section when none
    3. capped output with `+N more`.
5. Delivery item persistence idempotency.
6. Retry determinism:
    1. repeated send attempt for same delivery must not recompute watched flags.
7. Contract and backward-compat tests for capability-gated payload fields.

## Frontend tests

1. Product detail watch button toggles and persists.
2. Run detail tables display `TrackedProductBadge` for watched rows.
3. Tracking settings usage card shows combined counts.
4. Category untrack notification includes auto-disabled watch count.
5. Accessibility:
    1. watch button state and labels
    2. badge accessible label.
6. Feature flag disabled state:
    1. watch actions hidden/disabled
    2. no broken requests are fired.
7. Rapid watch/unwatch actions converge to final intent.
8. Backward-compat session parsing:
    1. missing capability field is handled without runtime crash.
9. Settings watched-products subsection covers loading/empty/error/retry states.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run test --workspace=backend`
3. `npm run build --workspace=backend`
4. `npm run lint --workspace=frontend`
5. `npm run test --workspace=frontend`
6. `npm run build --workspace=frontend`

## Acceptance Criteria

1. Users can watch/unwatch products from Product Detail.
2. Watched products consume same slot budget as categories.
3. Untracking a category auto-disables watches that lose access.
4. Run detail tables show a consistent watched badge for watched products.
5. Emails place watched-product changes in a top-priority section.
6. Existing category-scoped authorization remains intact.
