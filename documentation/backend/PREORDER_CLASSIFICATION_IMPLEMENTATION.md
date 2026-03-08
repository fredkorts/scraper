# Preorder Classification Implementation Plan

## Status

Implemented (Phase 1 complete).

## Summary

Add first-class preorder detection so users can distinguish:

1. normal in-store products
2. preorder products

across product views and notification emails.

The feature will classify preorder state from scraped data and expose it as structured product metadata (`isPreorder`, optional ETA date, detection source).

## Implementation Notes

1. Phase 1 is implemented in backend, shared contracts, frontend UI/filtering, and notification templates.
2. Preorder metadata is recalculated on every scrape snapshot and stale flags are cleared when signals disappear.
3. API/query support includes `preorder=all|only|exclude` for run changes and cross-run changes.
4. Email notifications now include preorder markers and distinct preorder summary counts.
5. Phase 2 detail-page enrichment and dedicated reclassification job remain deferred.

## Goals

1. Detect preorder products reliably enough for production use.
2. Surface preorder state in API responses and frontend UI.
3. Improve notification relevance by highlighting preorder items.
4. Keep existing change detection behavior stable (price/stock/new product remains intact).

## Non-Goals

1. Replacing existing category taxonomy.
2. Rewriting diff engine semantics in this phase.
3. Full NLP extraction from arbitrary long descriptions.

## Current State

1. Scraper currently parses listing pages and stores:
    1. name
    2. prices
    3. stock state
2. Product descriptions are not stored or parsed.
3. Notification grouping uses existing change types only:
    1. `NEW_PRODUCT`
    2. `BACK_IN_STOCK`
    3. `PRICE_DECREASE`
    4. `PRICE_INCREASE`
    5. `SOLD_OUT`

## Key Product Decision

Use **preorder as metadata/tag**, not a new category tree node.

Reason:

1. Category hierarchy should stay source-of-truth from catalog.
2. Preorder is a product state and can coexist with many categories.
3. This avoids duplicate category logic and preserves existing subscriptions.

## Data Model Changes

Add to `Product`:

1. `isPreorder Boolean @default(false) @map("is_preorder")`
2. `preorderEta DateTime? @map("preorder_eta")` (stored from a date-only source)
3. `preorderDetectedFrom PreorderDetectionSource? @map("preorder_detected_from")`
4. optional `preorderLastCheckedAt DateTime? @map("preorder_last_checked_at")`

Add enum:

1. `PreorderDetectionSource`
2. `CATEGORY_SLUG | TITLE | DESCRIPTION`

Backfill:

1. Existing rows default to `isPreorder=false`.
2. ETA null unless parsed.

Migration:

1. Prisma migration in `backend/prisma/migrations`.
2. Regenerate Prisma client.

## Detection Strategy

## Phase 1 (low risk, fast)

Detect preorder via listing-level signals:

1. Category path/slug includes preorder terms:
    1. `eeltellimus`
    2. `eeltellimused`
    3. `preorder`
    4. `pre-order`
2. Product title text includes preorder terms.
3. Optional listing card text includes preorder banner if available.

## Phase 2 (higher accuracy)

Fetch product detail page when needed and parse:

1. description blocks
2. short description
3. meta text

Extract:

1. preorder marker phrase:
    1. `Tegemist on eeltellimusega`
2. ETA phrase:
    1. `Saabumise kuupäev: DD/MM/YYYY`

Store parsed ETA as a normalized date (no time component).

Architecture boundary (locked):

1. Phase 2 detail-page extraction runs in a separate enrichment job/queue, not in the critical scrape-run path.
2. Scrape run completion is not blocked by detail-page enrichment failures.
3. Enrichment retries follow bounded retry/backoff policy.

## Parsing Rules

Normalize text before checks:

1. lowercase
2. strip repeated whitespace
3. diacritic-safe matching

Regex set:

1. preorder marker regex list in dedicated constants file.
2. ETA regex list in dedicated constants file.

Source precedence:

1. `description` (highest confidence)
2. `title`
3. `category_slug`

## Lifecycle Rules (Locked)

1. Preorder state is recalculated on every scrape snapshot.
2. If no preorder signal is found in current context:
    1. set `isPreorder=false`
    2. set `preorderEta=null`
    3. set `preorderDetectedFrom=null`
3. `preorderLastCheckedAt` is updated whenever classification runs.
4. No manual admin override in this phase.

## Backfill/Reclassification Strategy

1. Add one-time classification command for existing products using phase-1 heuristics.
2. Run updates in batches to avoid long transactions.
3. Add rolling reclassification for products not seen recently to clear stale flags.

## Backend Implementation Steps

1. Add Prisma fields and migration.
2. Extend scraper parsed product type with preorder candidates:
    1. `isPreorderCandidate`
    2. optional `preorderEtaCandidate`
    3. optional `preorderDetectedFromCandidate`
3. Add parser utility:
    1. `backend/src/scraper/preorder.ts`
4. During persist:
    1. resolve and save preorder fields
    2. update preorder fields on existing products when values change
5. Expose fields from products/runs response mapping.
6. Keep change detection unchanged in this phase.
7. Add backfill command and rollout runbook steps.

## Notification Behavior

Add preorder emphasis without duplicating change rows:

1. Add preorder badge/tag in item rendering:
    1. text: `Preorder`
    2. include ETA if available
2. Add summary line:
    1. `Preorders in this report: X`
    2. `X` equals distinct preorder product count, not raw change row count.
3. Optional section ordering enhancement:
    1. add top section `Preorders` that includes preorder items grouped by existing change types.
    2. if this section is enabled, do not duplicate the same item in lower sections (single placement rule).

Decision lock for phase:

1. Phase 1: badge + summary only.
2. Phase 2: optional dedicated preorder section.

## API Contract Changes

Update shared contracts and frontend schemas:

1. `shared/src/index.ts`
2. frontend runtime schemas for:
    1. product detail
    2. run changes list
    3. dashboard views where product rows are shown

Contract ownership lock:

1. Shared package types/enums are source of truth for compile-time typing.
2. Frontend keeps runtime response validation via local schemas and maps validated payloads to shared types.
3. Do not duplicate preorder unions/constants ad hoc in route/components.

New fields:

1. `isPreorder: boolean`
2. `preorderEta?: string` (`YYYY-MM-DD` date format)
3. `preorderDetectedFrom?: "category_slug" | "title" | "description"`

Query filter contract:

1. Add preorder filter query param to relevant endpoints:
    1. `preorder=all|only|exclude`
2. Filtering is backend-driven so pagination/sorting counts stay correct.
3. Frontend query keys must include preorder filter value.

## Frontend UX Changes

Affected frontend surfaces (locked):

1. Dashboard changes table view (`/app/changes`) preorder filter + badge.
2. Run detail changes section preorder badge.
3. Product detail summary/meta preorder badge + ETA.
4. Any shared change row renderer reused by the above.

5. Show preorder badge in:
    1. changes tables
    2. product detail header/meta
6. Add filter control where relevant:
    1. `All`
    2. `Preorder only`
    3. `Non-preorder only`
    4. filter state is URL-backed via TanStack Router search params (source of truth).
7. Show ETA text when present:
    1. `Arrival: 2026-06-19`

Reuse existing shared components:

1. `DataTable`
2. shared filter controls
3. shared notification system

Frontend state architecture lock:

1. Add one shared hook for preorder filter search-state mapping in the runs feature (or shared hooks if reused across features).
2. Components remain presentation-focused; query/search mapping logic must stay in hooks/utilities.
3. Avoid duplicate filter parsing in multiple routes/components.

## Reliability and Performance

1. Phase 1 adds negligible cost.
2. Phase 2 detail-page fetch must be bounded:
    1. configurable concurrency
    2. request timeout
    3. retry policy follows existing scraper retry rules
3. Cache product detail preorder parse for a minimum refresh window to reduce repeated fetches.
4. Detail-page enrichment must respect existing scraper politeness controls:
    1. robots checks
    2. adaptive delays
    3. host-level concurrency limits

## Testing Plan

## Backend unit tests

1. Preorder text matcher:
    1. Estonian and English phrases
    2. false-positive guards
2. ETA parser:
    1. valid date extraction
    2. invalid date handling

## Scraper integration tests

1. listing with preorder keyword -> `isPreorder=true`
2. listing without keyword -> `isPreorder=false`
3. detail-page ETA extraction (phase 2)
4. stale preorder state is cleared when signal disappears

## API tests

1. responses include preorder fields
2. authorization scope unchanged

## Notification tests

1. preorder badge appears in text/html templates
2. summary counts are correct
3. summary uses distinct preorder product counting
4. no duplicate item rendering when grouped section mode enabled

## Frontend tests

1. preorder badge renders in rows/details
2. preorder filter updates table results
3. ETA rendering format is correct
4. preorder filter round-trips through URL search params (`back/forward/reload` stable)
5. query key includes preorder filter (no stale cache collision)
6. filter control has accessible label and keyboard-operable behavior

## Rollout Plan

1. Ship schema + phase 1 parser + API fields.
2. Deploy and run migration.
3. Run one-time backfill classification command.
4. Validate on live runs for known preorder products.
5. Enable UI badge/filter.
6. Enable notification preorder summary.
7. Evaluate precision/recall for one week.
8. If needed, implement phase 2 detail-page extraction.

## Risks and Mitigations

1. False positives from keyword matching.
    1. Mitigation: source precedence + conservative regex + tests.
2. ETA date format variance.
    1. Mitigation: fallback to null ETA when parse uncertain.
3. Performance impact if detail fetch enabled.
    1. Mitigation: phase gating, concurrency caps, cache window.

## Acceptance Criteria

1. Known preorder products are flagged as preorder in DB and API.
2. Frontend visibly distinguishes preorder items.
3. Notification emails include preorder context.
4. Existing run/change behavior and tests remain stable.
5. Lint/test/build pass for touched workspaces.
6. Preorder state is recalculated per scrape and stale flags are cleared.
7. ETA is exposed as date-only (`YYYY-MM-DD`) consistently.
