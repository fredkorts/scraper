# Diff Engine Implementation Plan

## Goal

Implement the Phase 2 diff engine so that each completed `scrape_run` can produce:

- one canonical `change_report`
- a set of `change_items`
- updated `scrape_runs` summary counters
- per-user `notification_deliveries`

The implementation must stay aligned with the current stack and data model:

- backend: Node.js + Express + TypeScript
- data layer: Prisma + PostgreSQL
- queue/scheduling later: Redis/Bull
- canonical product model: `products` + `product_categories`
- canonical diff model: one `change_report` per `scrape_run`, never per user

This plan assumes the current scraper behavior is already in place:

- products are canonical by `external_url`
- `product_snapshots` are state-based, not full-run copies
- `persistScrapeResults` returns `missingProductUrls`
- `products.first_seen_at` is populated when a product is first created
- scrape runs already store `totalProducts`, `newProducts`, `priceChanges`, `soldOut`, `backInStock`

## Scope

Included in this phase:

- diffing a completed scrape run against prior known state
- detecting:
  - `price_increase`
  - `price_decrease`
  - `new_product`
  - `sold_out`
  - `back_in_stock`
- creating `change_reports`
- creating `change_items`
- updating `scrape_runs.soldOut` and `scrape_runs.backInStock`
- creating `notification_deliveries` for subscribed users
- backend unit/integration tests for diff behavior

Explicitly out of scope here:

- sending actual emails
- digest aggregation implementation
- Bull worker wiring
- scheduler orchestration
- frontend diff views

## Why this design fits the project

This design matches the product goals:

- users care about actionable category changes, not raw scrape internals
- free users need canonical change aggregation for digests
- paid users need immediate per-run change detection
- the system should scrape once per category and fan out to many users

This design matches the current schema:

- `change_reports` is canonical per `scrape_run`
- `notification_deliveries` is the user-specific layer
- `products` remains the single source of latest known state
- `product_snapshots` preserves the historical timeline when state changes

This design also avoids two common mistakes:

- duplicating identical diffs per user
- relying only on snapshots for absence detection, which does not work with state-based snapshotting

## Core Diff Model

The diff engine should compare the current scrape run against the immediately previous completed scrape run for the same category.

It should produce category-scoped changes only.

That means:

- a product may belong to multiple categories
- the diff is only concerned with the category currently being processed
- category-local absence may be recorded as diagnostics, but not as proof of a global stock transition

## Source of truth by change type

### New product

Source:

- `products.first_seen_at`
- current-run `product_snapshots`
- the current `scrape_run.id`

Rule:

- emit `new_product` only when:
  - the product has a current-run snapshot
  - and `products.first_seen_at` falls within the current run window
  - and the product was first created in the whole system during this run

Practical implementation rule:

- treat a product as `new_product` when `product.firstSeenAt` is greater than or equal to `scrapeRun.startedAt`
- and less than or equal to `scrapeRun.completedAt`
- and the product has a snapshot in the current run

This makes `new_product` identification deterministic and retry-safe without relying on an ephemeral in-memory "first-seen set".

Important note:

- if a known product appears in this category for the first time because of multi-category membership, that is not a global `new_product`
- phase 2 should treat `new_product` as globally new to the system, not merely new to the category

### Price increase / decrease

Source:

- current product state
- previous changed snapshot for that product before this run, if one exists

Rule:

- emit exactly one price change item per product per run
- if `current_price > previous_price`, emit `price_increase`
- if `current_price < previous_price`, emit `price_decrease`
- if no persisted historical price baseline exists, do not emit a price-change item

### Sold out

Source:

- current-run `product_snapshots` whose `in_stock = false`
- previous persisted historical state for the same product
- current canonical `products.in_stock` only as the latest post-scrape state

Rule:

- treat `products.in_stock` as global truth
- emit `sold_out` only when there is explicit out-of-stock evidence in persisted data
- specifically, emit `sold_out` when:
  - the product has a current-run snapshot with `in_stock = false`
  - and the most recent persisted historical state before this run was `in_stock = true`

Do not emit `sold_out` from category-local absence alone.

Reason:

- products are canonical across multiple categories
- absence from one category page does not prove the product is globally out of stock
- mutating global `products.in_stock` from category-local absence would corrupt canonical state

### Back in stock

Source:

- current product state
- previous known product state

Rule:

- emit `back_in_stock` when a product was previously `in_stock = false` and is now `in_stock = true`

Because the scraper already writes changed snapshots for explicit stock changes, the diff engine usually only needs to detect and record the change item, not create an extra snapshot.

## End-to-end flow

### Step 1: choose the current run

Input:

- `scrapeRunId`

Preconditions:

- run exists
- run status is `COMPLETED`
- run does not already have a `change_report`

If a report already exists:

- treat the operation as idempotent
- return the existing report summary instead of recreating it

### Step 2: load current run context

Load:

- the current `scrape_run`
- its category
- all `product_snapshots` written for this run
- the category’s current `product_categories`
- the set of product IDs and URLs involved in the run

Also load:

- persisted run counters: `newProducts`, `priceChanges`

### Step 3: load prior baseline

Find the immediately previous `COMPLETED` `scrape_run` for the same category with `started_at < current.started_at`.

Then load the previous known state for products relevant to this category.

The baseline must come from persisted historical data only.

Reason:

- the system uses state-based snapshots
- the scraper mutates canonical `products` before diffing
- overwritten product rows cannot be used to reconstruct pre-run state

Practical baseline strategy:

- current state comes from:
  - current canonical `products`
  - current-run `product_snapshots`
- previous state comes from:
  - the most recent `product_snapshot` before the current run for each relevant product
- if no pre-run snapshot exists for a product, the diff engine must treat prior comparison state as unavailable rather than inferred

Implementation note:

- because the current scraper mutates `products` before diffing, the diff engine must not infer previous values from current product rows
- if later implementation shows that too many products lack usable historical baselines, add persisted run-scoped comparison state rather than inference

## Recommended implementation approach

### Step 4: build the comparison sets

Construct:

- `currentSnapshotsByProductId`
- `latestPreRunSnapshotByProductId`
- `currentProductsByProductId`

Do not use `missingProductUrls` to derive `sold_out`.

`missingProductUrls` remains useful as an observability signal, but not as a stock-change source of truth.

### Step 5: detect change items

Process products in this order:

1. current-run snapshots
2. products first seen during the current run

For each product:

- determine previous price and stock state
- determine current price and stock state
- emit at most:
  - one price change item
  - one stock change item
  - one `new_product` item

Allowed combinations:

- `new_product` only
- `price_increase` only
- `price_decrease` only
- `sold_out` only
- `back_in_stock` only
- price change + stock change in the same run if both occurred

Disallowed:

- both `price_increase` and `price_decrease` for the same product/run
- both `sold_out` and `back_in_stock` for the same product/run

### Step 6: handle missing-product sold-out transitions

For phase 2, do not synthesize sold-out transitions from missing product URLs.

Instead:

- record `missingProductUrls` as diagnostics only
- rely on explicit out-of-stock snapshots for `sold_out`

If the live site later proves that globally sold-out items consistently disappear without any explicit out-of-stock signal, revisit the data model and add persisted run-scoped presence evidence before changing diff semantics.

### Step 7: persist the canonical report

Within a transaction:

- create `change_report`
- insert `change_items`
- update `scrape_runs.soldOut`
- update `scrape_runs.backInStock`

Set:

- `change_reports.totalChanges = change_items.length`
- `scrape_runs.soldOut = count(sold_out items)`
- `scrape_runs.backInStock = count(back_in_stock items)`

If there are no change items:

- do not create a `change_report`
- leave counters at zero
- do not create notification deliveries

### Step 8: create notification deliveries

If a report exists:

- query active subscribers for the category
- query each user’s active default email channel
- create `notification_deliveries`

Rules:

- paid users: create delivery rows with initial `PENDING` status for immediate send
- free users: also create `PENDING` delivery rows, but email sending is deferred to the digest workflow

This keeps delivery state uniform and lets later jobs decide how to dispatch.

## Suggested backend structure

### New files

- `backend/src/diff/types.ts`
- `backend/src/diff/build-baseline.ts`
- `backend/src/diff/detect.ts`
- `backend/src/diff/persist.ts`
- `backend/src/diff/run.ts`

### Responsibilities

`types.ts`

- internal comparison types
- normalized previous/current product state types

`build-baseline.ts`

- fetch current run context
- fetch previous run baseline
- resolve latest pre-run snapshot per product

`detect.ts`

- pure diff logic
- returns normalized pending change items and run counters

`persist.ts`

- transaction for:
  - `change_report`
  - `change_items`
  - `notification_deliveries`
  - `scrape_run` counters

`run.ts`

- orchestration entrypoint
- idempotency checks
- logging/error handling

## Important implementation rules

### Idempotency

The diff engine must be safe to retry.

Rules:

- if `change_report` already exists for `scrapeRunId`, do not recreate it
- if notification deliveries already exist for the report, do not recreate them

### Transaction boundaries

Use a single Prisma transaction for the persistence phase.

Do not perform heavy read-side baseline assembly inside that transaction.

Recommended split:

- read and compute outside transaction
- write atomically inside transaction

This keeps transaction time low and avoids the timeout issue already seen in scraper persistence.

### Category scoping

Never treat a product missing from one category as globally removed from the store.

Only emit `sold_out` when persisted historical data shows a real stock transition from `true` to `false`.

### Duplicate suppression

The detection logic must deduplicate by:

- `productId`
- `changeType`
- `scrapeRunId`

This matters for:

- repeated missing-product signals
- products that changed price and stock in the same run
- products appearing in multiple category paths

## Edge cases

### First completed run for a category

Behavior:

- do not emit diff items that require historical comparison:
  - `price_increase`
  - `price_decrease`
  - `sold_out`
  - `back_in_stock`
- emit `new_product` only for products whose `first_seen_at` falls within the current run window

Rationale:

- `new_product` is determinable from persisted creation timing
- the other change types require historical baseline data

### Product unchanged and no current-run snapshot exists

Behavior:

- no change item
- no snapshot

Rationale:

- consistent with state-based snapshot design

### Product missing but already out of stock

Behavior:

- no new `sold_out`

Reason:

- missing URLs are not used as explicit stock evidence in phase 2

### Product present with changed price and changed stock

Behavior:

- emit both:
  - one price change item
  - one stock change item

### Product appears in multiple categories

Behavior:

- the diff engine only reasons within the currently processed category
- do not let changes in another category create duplicate change items for this run

### Product newly linked to this category but not globally new

Behavior:

- do not emit `new_product` in phase 2

Rationale:

- current product semantics define `new_product` as newly discovered in the system

If category-entry events are needed later, add a new change type rather than overloading `new_product`.

### Price changes where old or new price is missing

Behavior:

- do not emit a price change unless both old and new prices are known
- log and surface as a diff warning if historical comparison data is incomplete

### Product has no pre-run historical snapshot

Behavior:

- do not infer previous price or stock from the overwritten current product row
- only emit `new_product` if `first_seen_at` proves it
- otherwise skip historical change emission for that product and record a diff warning

### Failed or partial scrape runs

Behavior:

- only diff `COMPLETED` runs
- never diff `FAILED` or `RUNNING` runs

## Testing plan

### Unit tests: pure detection logic

File:

- `backend/src/diff/detect.test.ts`

Cases:

- first run produces only `new_product`
- first completed run for a category does not emit `new_product` for products first seen in earlier runs or categories
- price increase detected correctly
- price decrease detected correctly
- sold out detected from explicit out-of-stock snapshot
- back in stock detected correctly
- unchanged product produces no item
- price change + sold out in same run produces two items
- product without pre-run snapshot does not emit inferred price or stock changes
- duplicate raw inputs collapse to one normalized change item

### Service/integration tests: baseline + persistence

Files:

- `backend/src/diff/run.test.ts`
- `backend/src/diff/persist.test.ts`

Cases:

- creates one canonical `change_report` for a completed run
- creates expected `change_items`
- updates `scrape_runs.soldOut` and `scrape_runs.backInStock`
- creates `notification_deliveries` for active subscribers only
- skips delivery creation when no report exists
- retrying the same run is idempotent
- no report is created when zero changes are detected
- `new_product` is identified from `first_seen_at` plus current-run snapshot membership

### DB-backed notification tests

Cases:

- one user with default email channel gets one delivery
- user without active channel gets no delivery
- duplicate subscriptions do not create duplicate deliveries
- free and paid users both get delivery rows, dispatch behavior deferred

### Regression tests

Cases:

- a product with no snapshot in the immediately previous run can still be diffed correctly using latest pre-run state
- a multi-category product does not emit duplicate `new_product`
- missing product URL handling does not generate false `sold_out` changes

## Manual verification

After implementation:

1. Run a real category scrape twice.
2. Modify one known product price in test fixtures or staging data.
3. Verify:
   - one `change_report` exists for the later run
   - expected `change_items` exist
   - `scrape_runs` counters match item counts
   - `notification_deliveries` were created for subscribed users
4. Simulate an explicit out-of-stock transition and verify:
   - `sold_out` item created
   - no duplicate change item is created on retry

## Open implementation considerations

These should be resolved during implementation, not left implicit:

- whether to store diff warnings anywhere or only log them
- whether free-user deliveries should be created immediately as `PENDING` or `SKIPPED` until digest time

Recommended choice:

- create them immediately as `PENDING`

Reason:

- one canonical delivery pipeline is simpler than bifurcating persistence rules by role

## Implementation order

1. Add diff module types and pure detection logic.
2. Add baseline loader for previous state reconstruction.
3. Add persistence layer for `change_reports`, `change_items`, and delivery rows.
4. Add orchestration entrypoint by `scrapeRunId`.
5. Add DB-backed tests.
6. Manually verify against local seeded data and a real category.

## Definition of done

The diff engine is done when:

- a completed scrape run can be processed exactly once into a canonical report
- all five change types are detected correctly
- sold-out due to missing products is handled correctly
- duplicate reports/deliveries are prevented on retry
- `scrape_runs` counters reflect the diff output
- backend tests cover the core logic and retry/idempotency paths
