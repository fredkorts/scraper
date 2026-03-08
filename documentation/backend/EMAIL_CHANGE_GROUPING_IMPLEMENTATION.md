# Email Change Grouping Implementation Plan

## Status

Implemented.

## Summary

Improve alert and digest email readability by grouping product changes into clear, actionable sections with strict precedence.

Current behavior renders a long flat list of `changeItems`, which is hard to scan when a category has many updates.  
Target behavior renders grouped sections in priority order so users immediately understand what matters.

## Goals

1. Group changes into deterministic categories in both immediate and digest emails.
2. Keep one canonical classification rule shared by all email types.
3. Preserve existing notification delivery flow and statuses (`PENDING`, `SENT`, `FAILED`, `SKIPPED`).
4. Prevent duplicate listing of the same product change across multiple sections.

## Non-Goals

1. No queue/scheduler architecture changes.
2. No delivery retry model changes.
3. No user preference UI for section toggles in this phase.
4. No frontend dashboard changes in this phase.

## Current State

Relevant files:

1. `backend/src/notifications/templates.ts`
2. `backend/src/notifications/templates.test.ts`
3. `backend/src/notifications/types.ts`
4. `backend/src/notifications/helpers.ts`
5. `backend/src/notifications/send-immediate.ts`
6. `backend/src/notifications/send-digest.ts`

Current rendering:

1. Summary counts by raw `changeType`.
2. Flat item list (`renderItemText`, `renderItemHtml`).
3. No sectioned grouping for large result sets.

## Locked Product Decisions

Section order (top-to-bottom):

1. `New products`
2. `Back in stock`
3. `Price drops`
4. `Price increases`
5. `Out of stock`
6. `Removed / delisted`
7. `Other changes`

Notes:

1. `Back in stock` is explicitly separated from generic stock changes.
2. `Price drops` and `Price increases` are separate buckets.
3. One item belongs to exactly one section per report.
4. Section lists are capped per section to preserve scanability:
    - immediate email: show up to 20 items per section
    - digest email: show up to 10 items per section, per report
5. Each section shows overflow text when capped (example: `+33 more in this section`).
6. Header context block is mandatory in every email:
    - category
    - run timestamp
    - total changed products
    - total sections with content
7. CTA hierarchy is mandatory:
    - primary CTA: `View all changes in dashboard`
    - secondary CTA: `Open category runs`
8. Stock values must be user-facing labels, never raw booleans/null:
    - `true` -> `In stock`
    - `false` -> `Out of stock`
    - `null/unknown` -> `Unknown`
9. Items within each section must use deterministic ordering:
    - `new_product`: newest scrape order first (stable by `changeItem.id` fallback)
    - `back_in_stock` / `out_of_stock`: alphabetical by product name
    - `price_drop` / `price_increase`: largest absolute percentage delta first
    - `removed`: alphabetical by product name
    - `other`: alphabetical by product name
10. CTA link contract must be versioned and explicit to avoid route drift:

- primary CTA -> `${APP_FRONTEND_URL}/app/runs?page=1&pageSize=25&sortBy=startedAt&sortOrder=desc&categoryId=<categoryId>`
- secondary CTA -> `${APP_FRONTEND_URL}/app?categoryId=<categoryId>`

11. Email context timestamp formatting contract:

- default timezone: `UTC`
- format: ISO-like readable string with timezone suffix (example: `2026-03-08 10:32 UTC`)
- future enhancement: user-specific timezone from profile settings (out of scope in this phase)

## Classification Model

## Proposed enum

Add notification-level category enum in `backend/src/notifications/types.ts`:

1. `new_product`
2. `price_drop`
3. `price_increase`
4. `back_in_stock`
5. `out_of_stock`
6. `removed`
7. `other`

Also add mirrored shared contract enum in `shared/src/index.ts`:

1. `NotificationChangeCategory`

Backend uses this shared enum instead of a backend-only duplicate.

## Precedence (single bucket)

For each `ReportChangeItem`, classify with the first matching rule:

1. If `changeType === NEW_PRODUCT` -> `new_product`
2. If `changeType` indicates removal/delisting (new enum support or derived rule) -> `removed`
3. If stock changed `false -> true` -> `back_in_stock`
4. If stock changed `true -> false` -> `out_of_stock`
5. If price changed and `newPrice < oldPrice` -> `price_drop`
6. If price changed and `newPrice > oldPrice` -> `price_increase`
7. Else -> `other`

Design rule:

1. Stock transition buckets outrank price buckets.
2. If stock and price changed together, item is listed once in stock bucket, but price delta still shown in row details.

## Implementation Design

## 1) Shared classifier

Create `backend/src/notifications/change-grouping.ts`:

1. `classifyChangeItem(item): NotificationChangeCategory`
2. `groupChangeItems(items): Record<NotificationChangeCategory, ReportChangeItem[]>`
3. `buildSectionSummaries(groups)` for top summary line rendering.

Keep template files presentation-focused by moving logic out of `templates.ts`.

## 2) Template rendering updates

Update `backend/src/notifications/templates.ts`:

1. Replace flat list rendering with grouped section rendering.
2. Keep row content, but convert raw transitions into user-readable labels.
3. Render only non-empty sections.
4. Top summary format example:
    - `New products: 53, Price drops: 2, Back in stock: 4`
5. Keep plain-text and HTML output semantically aligned.
6. Add mandatory context block near top:
    - category name
    - run timestamp
    - total changed products
7. Add CTA block near top and repeated at bottom for long emails.
8. Add per-section rendering cap and overflow line.
9. Render timestamps using the explicit formatting contract.
10. Render items in each section using deterministic sort rules.

## 3) Digest rendering

Digest currently groups by category/report only. Keep that structure, but within each report:

1. Apply same section grouping rules.
2. Render grouped blocks per report.
3. Use digest-specific per-section cap.
4. Include digest-level CTA and per-report quick links where available.

This keeps parity between immediate alerts and digests.

## 4) Removed/delisted support

Current Prisma `ChangeType` may not include a removal type in production code path.

Phase approach:

1. Implement `removed` bucket as dormant/fallback initially.
2. If `ChangeType.REMOVED_PRODUCT` exists (or is added later), map it immediately.
3. If not present, classifier keeps path without runtime break.

## File Changes

Create:

1. `backend/src/notifications/change-grouping.ts`
2. `backend/src/notifications/change-grouping.test.ts`

Update:

1. `backend/src/notifications/templates.ts`
2. `backend/src/notifications/templates.test.ts`
3. `backend/src/notifications/types.ts`
4. `backend/src/notifications/helpers.ts` (if additional links/context fields are required by templates)
5. `shared/src/index.ts`

Optional docs sync:

1. `documentation/backend/EMAIL_FLOW_IMPLEMENTATION.md` (note grouped rendering behavior).

## User Stories

1. As a user, I want new products listed first so I can immediately spot newly listed items.
2. As a user, I want price drops separated from price increases so I can prioritize deals.
3. As a user, I want back-in-stock items highlighted so I can buy unavailable items once they return.
4. As a user, I want out-of-stock items grouped so I can understand availability loss quickly.
5. As a user, I want large emails to be scannable without reading every row.
6. As a user, I want clear action links so I can quickly inspect full details in the dashboard.
7. As a user, I want readable stock/price wording instead of technical value transitions.

## Edge Cases

1. Item has both stock and price change in one diff: appears once based on precedence.
2. `oldPrice`/`newPrice` null handling: avoid invalid numeric comparisons.
3. `oldStockStatus`/`newStockStatus` null handling: avoid false transitions.
4. Unknown or future `changeType`: route to `other`.
5. Report with many items in one bucket and none elsewhere: render only one section cleanly.
6. Digest with multiple reports/categories: section grouping remains per report and deterministic.
7. Overflow in one or multiple sections: cap and show `+X more` summary correctly.
8. Product names with special characters still render safely and legibly.
9. Unknown stock states render as `Unknown`, never `null`.
10. Very long emails keep top CTA visible without scrolling entire content.

## Testing Plan

## Unit tests (`change-grouping.test.ts`)

1. Classifies each known `changeType` correctly.
2. Enforces precedence for mixed stock+price changes.
3. Handles null/undefined price and stock safely.
4. Falls back to `other` for unknown combinations.

## Template tests (`templates.test.ts`)

1. Immediate email renders grouped sections in required order.
2. Digest email renders grouped sections inside each report.
3. Empty section omission works (no blank headings).
4. Summary line reflects section counts, not raw `changeType` dump.
5. Existing HTML escaping remains correct for product names/URLs.
6. Stock labels render as `In stock` / `Out of stock` / `Unknown`.
7. Per-section cap is enforced and overflow text is correct.
8. Context block renders required fields.
9. Primary and secondary CTAs render in both HTML and text versions.
10. Plain-text output remains readable for mobile/narrow clients (line wrapping-friendly content).
11. CTA URLs exactly match the agreed query contract.
12. Timestamps render with expected timezone suffix (`UTC`).
13. Section item ordering is deterministic and stable.

## Regression tests

1. `send-immediate.test.ts` remains green without delivery status behavior changes.
2. `send-digest.test.ts` remains green without digest eligibility behavior changes.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run test --workspace=backend`
3. `npm run build --workspace=backend`

If local DB-backed tests are required, run with configured `TEST_DATABASE_URL`.

## Acceptance Criteria

1. Immediate and digest emails render sectioned change groups.
2. Section order matches locked product decision order.
3. Each change item appears in exactly one section.
4. Summary counts reflect grouped sections.
5. Per-section caps and overflow indicators are applied.
6. Context block and CTA hierarchy are present in both immediate and digest emails.
7. Raw stock booleans/null are not visible in final email copy.
8. CTA URLs match the explicit route/query contract.
9. Timestamp rendering follows the documented default timezone format.
10. All notification backend tests pass.
11. No changes to notification delivery status flow semantics.

## Risks and Mitigations

1. Risk: classification drift between immediate and digest.
   Mitigation: single classifier module consumed by both template paths.
2. Risk: future `ChangeType` additions silently miscategorized.
   Mitigation: explicit fallback to `other` and test coverage for unknowns.
3. Risk: very large emails become too long.
   Mitigation: enforce per-section cap in this phase and always provide CTA to full dashboard view.
4. Risk: CTA links become stale if routes change.
   Mitigation: build links from centralized route helpers/constants and test link presence.
5. Risk: backend and frontend drift on category enum names.
   Mitigation: define `NotificationChangeCategory` in `shared/src/index.ts` and consume from both sides.
6. Risk: non-deterministic ordering causes flaky tests and inconsistent UX.
   Mitigation: explicit sort rules per section and test assertions for order.
