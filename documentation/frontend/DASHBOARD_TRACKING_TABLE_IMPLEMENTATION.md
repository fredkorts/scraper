# Dashboard Tracking Table Implementation

## Status

Planned (March 16, 2026).

## Summary

Replace the dashboard home `Recent Failures` panel with a full-width tracking management section that combines tracked categories and tracked products in one table.

The new section includes:

1. `Track a Category` controls at the top (same interaction model as Settings > Tracking).
2. A table with columns:

- `Type` (`Category` or `Product`)
- `Name`
- `Last Change` (latest scrape timestamp where that entity had any change)
- `Actions` (icon-only `Cancel tracking` button)

3. Tracking capacity context near controls:

- `Used / limit / remaining` slots with plan-aware messaging.

Also update layout so:

1. `Latest Runs` is full width.
2. `Latest Runs` appears above the new tracking table section.

Retain scraper-health visibility by replacing the large failures panel with a compact health strip that links to filtered runs.

## UX Goals

1. Turn dashboard home into an actionable tracking surface (not just passive reporting).
2. Keep key operations on one screen: add category tracking, review current tracked entities, and stop tracking.
3. Maintain compact, scannable information hierarchy:

- Summary cards
- Latest Runs (full width)
- Tracking table (full width)

4. Make tracker state comprehensible at a glance:

- what is tracked, how fresh data is, and what actions are available next.

## Scope

1. Include:

- Dashboard home view and section layout.
- Backend dashboard payload extension for tracked-entity rows with `lastChangeAt`.
- Compact scraper-health strip on dashboard home (derived from existing `recentFailures` payload).
- Reuse existing tracking mutations (subscribe/unsubscribe/unwatch).
- Frontend and backend tests for new behavior.

2. Exclude:

- Settings tab redesign.
- Changes explorer behavior.
- Notification channel behavior.

## Proposed API Contract Change

Extend `GET /api/dashboard/home` response with a new `trackingOverview` block.

```ts
interface DashboardTrackingRow {
    rowId: string; // "category:<subscriptionId>" | "product:<trackedProductId>"
    type: "category" | "product";
    name: string;
    lastChangeAt?: string; // ISO timestamp; omitted if never changed
    actionToken: string; // opaque signed action token (short TTL), replaces raw action ids in client payload
    categoryId?: string; // present only when needed for navigation/filter context
}

interface DashboardTrackingOverview {
    rows: DashboardTrackingRow[];
}
```

`DashboardHomeResponse` adds:

```ts
trackingOverview: DashboardTrackingOverview;
```

## Compatibility and Rollout Contract

1. Strict compatibility phase:

- Phase A: backend ships `trackingOverview` first.
- Phase B: frontend consumes `trackingOverview` as optional.
- Phase C: after backend stability window, frontend can enforce required shape.

2. During compatibility phase:

- frontend schema must accept missing `trackingOverview` and render a safe fallback empty table.
- no hard failure is allowed when older backend payload is returned.

3. Compatibility window:

- keep legacy `recentFailures` response field unchanged even though the large panel is removed.
- remove or refactor unused payload only in a later cleanup release after telemetry confirms no consumer dependency.

4. Phase-specific schema rules:

- Phase B frontend schema:
    - `trackingOverview: z.object({ rows: z.array(...) }).optional().default({ rows: [] })`
- Phase C frontend schema:
    - `trackingOverview` becomes required after cutover.
- Add an explicit feature flag (or release toggle) for enforcing required schema in frontend.

5. Frontend normalization rule:

- query layer must normalize payload to a stable view model:
    - `normalized.trackingOverview.rows` is always an array in UI code.
- component code must never branch on raw optional API fields.

6. Frontend type strategy (optimal choice):

- add a query-boundary compatibility adapter:
    - `DashboardHomeApiCompat` for raw backend payload (`trackingOverview` optional)
    - `DashboardHomeViewModel` for strict component consumption (`trackingOverview.rows` always array)
- all dashboard components consume only `DashboardHomeViewModel`.
- upgrade to strict required `trackingOverview` type only after compatibility exit criteria are satisfied.

## Last Change Semantics

1. Category row:

- `lastChangeAt` is the latest `changeReport.createdAt` for that category where `totalChanges > 0`.

2. Product row:

- `lastChangeAt` is the latest `changeReport.createdAt` where a `changeItem` exists for that product within the authenticated user's allowed category scope.

3. If no qualifying change exists:

- return `undefined` and render `No changes yet` in UI.

4. Scope parity:

- `lastChangeAt` must use the same category/access scope model as dashboard runs and changes APIs.

## Architecture Notes

1. Keep one dashboard query for page data (`/api/dashboard/home`) to avoid extra network round-trips.
2. Reuse existing Settings mutations instead of duplicating dashboard-specific endpoints:

- `useCreateSubscriptionMutation`
- `useDeleteSubscriptionMutation`
- `useUntrackProductMutation`

3. Reuse existing category helpers:

- `buildCategoryTreeData`
- `CategoryTreeSelect`

4. To reduce feature coupling:

- add a shared tracking actions hook (`useTrackingActions`) used by both Settings and Dashboard instead of importing settings-specific orchestration directly.

5. Mutation concurrency and idempotency:

- row actions must be disabled while pending (per-row pending state).
- duplicate click protection is required for `Track category` and `Cancel tracking`.
- query invalidation must remain centralized and consistent with existing settings flows.

6. Row-level pending-state implementation:

- maintain pending state by stable row key (`rowId`) in component/hook state.
- disable only the affected row action while mutation is inflight.
- keep other row actions interactive.

7. Mutation UX policy (optimal choice):

- use optimistic updates for tracking actions:
    - untrack category/product: remove row immediately, rollback on failure.
    - track category: insert row immediately with `No changes yet`, rollback on failure.
- keep per-row pending lock until mutation settles.
- show success/error notifications on settle.

## Security Requirements

1. Scope enforcement (mandatory):

- backend must compute `trackingOverview` and `lastChangeAt` using the same access-scope guard used by dashboard/runs/changes endpoints.
- no cross-scope category/product activity may be included in response.

2. Ownership enforcement (IDOR protection):

- mutation endpoints used by dashboard actions must verify the `actionToken` signature, TTL, and ownership binding to the authenticated user.
- unauthorized target IDs must return `403` or `404` without leaking ownership details.
- unauthorized ownership failures must use normalized response body/code shape to avoid distinguishable probe responses.
- token key management:
- action-token signing keys must come from environment/config, never hardcoded.
- support current+previous key verification for key rotation without downtime.
- define max token TTL (recommended <= 15 minutes).

3. CSRF and trusted-origin integrity:

- dashboard-triggered mutations must continue to require valid CSRF token + trusted origin checks.
- missing/invalid CSRF token requests must be rejected.

4. Abuse and replay controls:

- apply per-user route rate limits for track/untrack actions.
- preserve idempotent mutation behavior for duplicate requests.
- maintain server-side duplicate protection even when client pending state fails.
- concrete limits:
    - `track category`: max 20 requests/min/user, burst 5.
    - `untrack category/product`: max 30 requests/min/user, burst 10.
    - return `429` with retry guidance after threshold exceeded.
- rate-limit backend:
- use distributed limiter storage (Redis) keyed by `userId + ip` so limits are enforced across all app instances.
- local in-memory limiter is not acceptable for production.

5. XSS-safe UI rendering:

- product/category names from scraper data are untrusted.
- render all names as plain text only; no HTML injection APIs.
- confirmation and tooltip copy must not use unsafe HTML rendering.

6. Privacy-safe observability:

- do not log raw searched names, raw filter text, or user-specific entity names.
- log only aggregate metrics (latency, row count, success/failure counts).

7. Cache policy for user-scoped dashboard payload:

- `/api/dashboard/home` responses must use `Cache-Control: private, no-store`.
- prevent intermediary/shared cache storage of user-specific tracking data.

8. Security audit trail:

- write structured audit events for tracking mutations:
    - actor user id
    - action (`track_category`, `untrack_category`, `untrack_product`)
    - target id + target type
    - outcome (`success`, `forbidden`, `not_found`, `rate_limited`, `error`)
    - timestamp + request id
- keep audit payload PII-safe (no raw product/category names).
- operational controls:
- minimum retention: 90 days.
- access restricted to admin/security roles only.
- audit logs are append-only (no user-driven mutation/delete path).

## Interaction Model

1. Health strip:

- show compact text above `Latest Runs`:
    - when failures exist: `Recent scraper failures detected` + link `View failed runs`
    - when none: `No recent scraper failures`
- source-of-truth:
    - use existing `recentFailures` from `/api/dashboard/home`
    - failure-present condition: `recentFailures.length > 0`
    - link target must be built from `defaultRunsListSearch` and override only:
        - `status=failed`
        - `categoryId` from current dashboard search (if present)
    - no inline hardcoded search objects in JSX.

2. Tracking table controls:

- add segmented filter: `All`, `Categories`, `Products`.
- add local text search on `Name` for faster scanning.
- deterministic data pipeline:
    - apply in order: `type filter` -> `name search` -> `sort` -> `paginate`.
    - pagination resets to page 1 when filter/search changes.
- state ownership (optimal choice):
    - keep filter/search/pagination in local component state (ephemeral UI control state).
    - keep only dashboard `categoryId` in URL.
    - filter/search/pagination changes must not mutate URL query string.
- capacity context:
- show `Slots used: X/Y` and `Remaining: Z` near `Track a Category`.
- if no remaining slots, disable create action with explicit reason text and link to plan/settings.

3. Timestamp presentation:

- render `Last Change` as localized absolute timestamp plus relative hint
    - example: `Mar 16, 2026 14:20 (2h ago)`.
- keep tooltip or title attribute with ISO value for precision/debugging.
- formatting/test strategy (optimal choice):
    - use a dedicated formatter utility:
        - `formatLastChange(value, { now, locale, timeZone })`
    - tests inject fixed `now` + explicit timezone to avoid flaky relative-time assertions.
- freshness signal:
- show `Last checked` at section level (latest run timestamp for current scope).
- if `Last Change` is empty, show `No changes yet` while `Last checked` confirms monitoring is active.

4. Destructive action UX:

- icon button must include tooltip text (`Cancel tracking`) and danger styling.
- confirmation copy must name the entity.
- category confirmation must warn about possible auto-disabled tracked products.
- post-action recovery:
- success toast includes `Undo` action for a short window (best-effort restore).

5. Row drill-down behavior:

- clicking `Name` opens contextual destination:
    - product row -> product detail page
    - category row -> runs list filtered by that category
- keep cancel icon action independent from row navigation.

6. Track product entry flow:

- include link/secondary CTA near controls: `Track a product` -> product search/detail flow.
- if scope/plan blocks product tracking, show explanatory disabled state.

## Frontend Plan

1. Dashboard view composition:

- Update [DashboardHomePageView.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/views/dashboard-home-page/DashboardHomePageView.tsx):
    - remove `Recent Failures` panel usage
    - add compact scraper-health strip
    - keep summary grid
    - render full-width `Latest Runs` panel
    - render new full-width tracking section below latest runs

2. New tracking section component:

- Add `frontend/src/features/runs/components/dashboard/dashboard-tracking-table-section.tsx`
    - top controls: `Track a Category` label + `CategoryTreeSelect` + `Track category` button
    - capacity summary (`Used / limit / remaining`) and plan-aware limit messaging
    - secondary CTA: `Track a product`
    - filter/search row: segmented type filter + name search
    - table region: shared `DataTable`
    - clickable `Name` cell routes to contextual destination
    - icon-only action buttons with clear `aria-label`
    - confirm cancel actions via `Popconfirm` (or equivalent confirmation pattern)
    - row-level pending/loading state for actions

3. New table column hook/type:

- Add `frontend/src/features/runs/hooks/use-dashboard-tracking-columns.tsx`
- Add/extend types in [dashboard-sections.types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/types/dashboard-sections.types.ts)

4. Schema/query changes:

- Extend [schemas.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/schemas.ts) with `trackingOverview`
- Update query typing in [queries.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/queries.ts)

5. Styling/layout:

- Update [dashboard-sections.module.scss](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/features/runs/components/dashboard/dashboard-sections.module.scss)
    - replace `splitColumns` usage in dashboard home path
    - add full-width section container styles
    - ensure mobile layout remains single-column with no overflow

6. Deterministic table ordering:

- default sort by `lastChangeAt desc`, then `type asc`, then `name asc`.
- if row count exceeds UI threshold (for example 50), add pagination.

7. Mobile behavior:

- on small screens use stacked cell content pattern:
    - row primary: `Name`
    - row secondary: `Type`, `Last Change`
    - action remains reachable without horizontal scroll.
- implementation strategy:
    - keep shared `DataTable` structure, but use custom cell renderers in tracking columns that render mobile-friendly stacked content containers.
    - avoid horizontal scroll as primary mobile strategy for this section.
    - keep desktop headers visible; on mobile, retain semantic table structure and readable row grouping via CSS.

## Backend Plan

1. Shared contracts:

- Extend `DashboardHomeResponse` and related interfaces in [shared/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/shared/src/index.ts)

2. Service implementation:

- Extend `getDashboardHome` in [runs.service.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/services/runs.service.ts) to include `trackingOverview.rows`
- Build rows from:
    - active `UserSubscription` items
    - active `UserTrackedProduct` items
- Compute per-row `lastChangeAt` with scoped aggregate queries
    - do not execute per-row queries (`N+1`); use batched aggregates for categories and products.
    - add or verify supporting indexes for the aggregate paths.

3. Validation/controller:

- No new endpoint required; update existing `/api/dashboard/home` response path in [runs.controller.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/controllers/runs.controller.ts) and [schemas/runs.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/schemas/runs.ts) if needed.

4. Performance guardrails:

- enforce query budget for dashboard home service path (single-digit DB query count target).
- log latency and row-count metrics for the new tracking overview payload.
- rollout thresholds:
    - endpoint target: `/api/dashboard/home` p95 <= 400ms in production.
    - hard guard: fail CI/service test if query count for dashboard home exceeds 9 queries.
    - trigger rollback if p95 exceeds 600ms for 15 minutes after rollout.

5. Security guardrails:

- reuse a single shared access-scope helper for `trackingOverview` and `lastChangeAt` queries.
- add explicit ownership checks in mutation services/controllers before executing delete/untrack operations.
- ensure existing CSRF middleware is applied to any dashboard mutation request path.
- enforce `Cache-Control: private, no-store` on `/api/dashboard/home`.
- emit structured audit events for all dashboard-triggered track/untrack mutations.
- use server-side action token verification (signature + TTL + user binding) before executing mutation.
- implement signing-key rotation support for action tokens (current key for signing, current+previous for verification).

## Accessibility Requirements

1. Icon-only action button must have explicit `aria-label`:

- `Cancel category tracking for <name>`
- `Cancel product tracking for <name>`

2. `Track a Category` controls must remain keyboard accessible and tab-order logical.
3. `Last Change` cells with no value should provide clear text (`No changes yet`), not blank.
4. Row-action safety:

- icon-only destructive actions require confirmation text that names the target entity.

5. State clarity:

- section must provide explicit `loading`, `empty`, and `error` states with clear recovery action.
- empty-state copy must include next-step CTA text (not only passive status).

6. Tooltip/help clarity:

- icon-only controls must have visible hover/focus tooltip text.
- `Last Change` field and fallback text must be understandable without backend knowledge.

7. Confirmation dialog keyboard behavior:

- `Popconfirm` must support:
    - `Enter` confirms
    - `Esc` cancels
    - focus returns to triggering action after close
    - dialog content announced to screen readers (title + warning copy).

## Test Plan

### Frontend

1. Update [scrape-views.test.tsx](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/frontend/src/routes/scrape-views.test.tsx):

- remove assertions for `Recent Failures` panel
- assert compact health strip is present and links to failed runs when failures exist
- assert `Latest Runs` remains visible and appears before tracking section
- assert tracking table headers: `Type`, `Name`, `Last Change`, `Actions`
- assert tracked category and product rows render from dashboard payload
- assert icon-only cancel controls are discoverable by role/name
- assert fallback render works when `trackingOverview` is missing (compatibility phase)

2. Add component test for new dashboard tracking section:

- `Track category` action triggers create-subscription mutation path
- cancel category row triggers delete-subscription mutation path
- cancel product row triggers untrack-product mutation path
- confirm dialog appears before destructive action
- category confirmation warns about potential auto-disabled tracked products
- default row order matches spec
- segmented filter and name search work together
- `loading`, `empty`, and `error` states are rendered correctly
- row-level pending state prevents duplicate mutation triggers
- only the active row action is disabled during cancel mutation
- health strip link builds search params from `defaultRunsListSearch`
- mobile stacked row content renders without horizontal overflow
- confirmation dialog keyboard flow works (`Enter`, `Esc`, focus return)
- compatibility adapter maps missing `trackingOverview` into strict view model rows array
- filter/search/pagination interactions do not update URL query string
- timestamp formatter tests are deterministic with injected `now` and timezone
- optimistic update behavior is verified, including rollback on mutation failure
- malicious entity-name test: UI renders `<script>...` strings safely as text
- confirmation/tooltip tests verify no unsafe HTML rendering path is used
- slot-capacity display tests (`used/remaining/limit`) including no-capacity state
- row name click routes to correct destination by type (product/category)
- section-level `Last checked` display tests for freshness reassurance
- undo toast appears after untrack and attempts best-effort restore
- empty-state copy includes actionable next steps

### Backend

1. Extend [runs.test.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/routes/runs.test.ts):

- `/api/dashboard/home` returns `trackingOverview.rows`
- rows are scoped to authenticated user
- `lastChangeAt` uses correct latest change timestamp
- entities with no changes return missing/empty `lastChangeAt`
- product `lastChangeAt` excludes out-of-scope category changes
- no per-row query pattern regression (query count guard or service-level test)
- existing `recentFailures` field remains stable for compatibility phase

2. Add/extend mutation security tests on subscription and tracked-product routes:

- cross-user ID attempts to delete/untrack are rejected (`403/404`)
- requests without CSRF token are rejected
- requests from untrusted origin are rejected
- repeated duplicate toggle requests remain bounded/idempotent
- ownership-failure responses are normalized (no distinguishable body/code variance by existence)
- route rate limits return `429` when thresholds are exceeded
- action-token tests:
    - expired token is rejected
    - invalid signature token is rejected
    - token minted for user A is rejected for user B
    - token signed by previous key remains valid during rotation window
- timing-side-channel safety:
- unauthorized ownership failures follow equivalent handler path and response shape with bounded latency variance.

3. Add/extend dashboard response security tests:

- `/api/dashboard/home` sends `Cache-Control: private, no-store`
- response rows include opaque `actionToken` only and do not expose internal action IDs

## Acceptance Criteria

1. Dashboard no longer renders the large `Recent Failures` panel.
2. `Latest Runs` is full width and above the tracking section.
3. Tracking section is full width and contains:

- top `Track a Category` controls
- table with required columns
- icon-only cancel action buttons

4. Category and product rows both appear in one table.
5. `Last Change` column is accurate and user-scoped.
6. Existing tracking mutations work from dashboard.
7. Frontend and backend tests are updated and passing.
8. Compatibility phase guarantees no dashboard crash during backend/frontend skew.
9. Destructive tracking actions require confirmation.
10. Compact scraper-health visibility remains on dashboard home.
11. Mobile view supports tracking actions without horizontal table scroll.
12. Query budget and latency for dashboard home remain within acceptable limits.
13. Table processing order is deterministic (`filter -> search -> sort -> paginate`) and tested.
14. Compatibility phase has explicit schema behavior in frontend and no parse failures during skew.
15. Compatibility adapter isolates raw API differences from component code.
16. Filter/search/pagination state remains local and does not pollute route search params.
17. Last-change timestamp rendering is deterministic and covered by timezone-safe tests.
18. Optimistic tracking updates are immediate and rollback safely on mutation errors.
19. No cross-scope data appears in `trackingOverview` or `lastChangeAt`.
20. Unauthorized ID mutation attempts are rejected without ownership leakage.
21. CSRF/trusted-origin protections are validated for dashboard-triggered mutations.
22. Untrusted entity names are rendered safely with no XSS vector.
23. `/api/dashboard/home` is served with `Cache-Control: private, no-store`.
24. Tracking overview rows expose only opaque short-lived `actionToken` fields for mutation actions.
25. Rate limits produce `429` under abuse thresholds and preserve service stability.
26. Track/untrack actions emit structured, PII-safe security audit events.
27. Users can see slot capacity and understand why track actions may be unavailable.
28. Users can open relevant detail views directly from tracking table rows.
29. Section shows freshness (`Last checked`) so `No changes yet` is not mistaken for failure.
30. Untrack success includes short-window undo affordance.
31. Action-token signature/TTL/user-binding validation blocks replay and cross-user misuse.
32. Audit log retention/access/tamper constraints are enforced.
33. Action-token keys are rotation-ready and sourced only from secure env configuration.

## Verification Commands

1. `npm run test --workspace=frontend -- src/routes/scrape-views.test.tsx`
2. `npm run test --workspace=backend -- src/routes/runs.test.ts`
3. `npm run lint --workspace=frontend`
4. `npm run lint --workspace=backend`
5. `npm run typecheck --workspace=frontend`
6. `npm run typecheck --workspace=backend`

## Risks and Mitigations

1. Risk: dashboard payload grows and slows initial render.
   Mitigation: keep row payload minimal, no heavy nested objects, cap row count if needed for admin.
2. Risk: ambiguous `lastChangeAt` semantics cause confusion.
   Mitigation: document semantics in code and tests; render `No changes yet` explicitly.
3. Risk: duplicated tracking logic across Settings and Dashboard.
   Mitigation: reuse existing settings mutations and shared category select helpers.
4. Risk: mobile overflow from table/actions.
   Mitigation: test at narrow widths and keep action cell width constrained with icon-only controls.
5. Risk: accidental untracking from icon-only controls.
   Mitigation: danger styling, tooltip, explicit confirmation copy, and row-level pending lock.
6. Risk: hidden regressions due to payload transition.
   Mitigation: compatibility phase with optional frontend schema and backend-first rollout.
7. Risk: stale compatibility mode remains forever.
   Mitigation: define deprecation exit criteria:

- telemetry shows <1% requests from old frontend build for 14 consecutive days
- two successful production releases with no dashboard parse errors
- then promote `trackingOverview` to required and remove compatibility fallback.

8. Risk: IDOR regression in dashboard action surface.
   Mitigation: explicit ownership checks + cross-user negative tests in backend routes.
9. Risk: CSRF protection regression after UI mutation expansion.
   Mitigation: required CSRF/trusted-origin route tests for dashboard action paths.
10. Risk: XSS via untrusted scraped entity names.
    Mitigation: text-only rendering policy + malicious payload frontend tests.
11. Risk: sensitive dashboard payload cached by intermediaries.
    Mitigation: enforce and test `Cache-Control: private, no-store`.
12. Risk: brute-force/abuse attempts on tracking mutations.
    Mitigation: concrete per-user rate limits + `429` tests + audit trail visibility.
13. Risk: ownership probing through response differences.
    Mitigation: normalized unauthorized error responses and explicit parity tests.
14. Risk: token replay or cross-user token misuse.
    Mitigation: short-lived signed action tokens bound to user identity with strict verification.
15. Risk: multi-instance rate-limit bypass.
    Mitigation: Redis-backed distributed limiter keyed by user+IP.
16. Risk: audit data tampering or overexposure.
    Mitigation: append-only audit sink, role-restricted access, and fixed retention policy.
17. Risk: action-token key compromise or stale keys.
    Mitigation: env-managed keys, regular rotation, current+previous verification window, and short token TTL.
