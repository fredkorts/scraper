# Implementation Plan - Basic Scraper Module

This plan covers the next Phase 1 backend milestone:

- build the basic scraper module

Specifically:
- fetch a single category page
- parse products with Cheerio
- handle pagination
- save results to `products`, `product_categories`, `scrape_runs`, and `product_snapshots`

This plan is intentionally limited to the first working scraper slice. It does not yet cover:
- Bull queue integration
- scheduled runs
- change reports
- notification delivery
- category auto-discovery from the website nav

## Goals

- scrape one category from `mabrik.ee`
- follow pagination until the category is complete
- extract the core product data required by the PRD
- persist canonical product state in PostgreSQL
- create snapshots only when tracked state changes
- record scrape-run metadata for observability

## Required Output

For each scraped product, persist:
- `name`
- `currentPrice`
- `originalPrice` when present
- `imageUrl`
- `externalUrl`
- `inStock`
- category membership

For each scrape run, persist:
- `categoryId`
- `status`
- `totalProducts`
- `newProducts`
- `priceChanges`
- `soldOut`
- `backInStock`
- `pagesScraped`
- `durationMs`
- `startedAt`
- `completedAt`
- `errorMessage` when failed

## Design Decisions

### 1. Canonical product identity

Use `externalUrl` as the canonical product key.

Reason:
- product URLs are stable enough for deduplication
- the schema already enforces uniqueness on `products.external_url`
- this supports restocks without duplicate product records

### 2. State-based snapshots

Create a `ProductSnapshot` only when one of these fields changes:
- `currentPrice`
- `originalPrice`
- `inStock`
- `name`
- `imageUrl`

Always update:
- `lastSeenAt`

Reason:
- aligns with the requirements
- avoids writing duplicate snapshots for unchanged products

### 3. Many-to-many category membership

Every discovered product should be linked to the scraped category through `ProductCategory`.

Reason:
- products may appear in multiple categories
- this matches the finalized database design

### 4. Scrape-run-first persistence

Every scrape begins by creating a `ScrapeRun` row with `status = RUNNING`.

At the end:
- update the same row to `COMPLETED` or `FAILED`
- persist aggregate counters on the run

Reason:
- scrape activity should always be traceable, even on failure

## Proposed Module Layout

### New files

#### [backend/src/lib/http.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/http.ts)
- shared Axios instance
- request timeout
- retry strategy with exponential backoff
- scraper-specific user agent

#### [backend/src/scraper/types.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/types.ts)
- raw parsed product shape
- scrape result types
- pagination result types

#### [backend/src/scraper/selectors.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/selectors.ts)
- centralize CSS selectors for product card parsing

#### [backend/src/scraper/parse.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/parse.ts)
- parse a category page HTML string into product records
- parse next-page URL if present

#### [backend/src/scraper/fetch.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/fetch.ts)
- fetch category pages
- enforce politeness delays
- enforce a hard ceiling of at most 1 request per second
- normalize category and page URLs

#### [backend/src/scraper/persist.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/persist.ts)
- upsert products
- maintain `ProductCategory`
- create snapshots only on tracked changes
- compute run counters

#### [backend/src/scraper/run.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/run.ts)
- orchestrate end-to-end scrape for one category
- create and finalize `ScrapeRun`

### Existing files to modify

#### [backend/package.json](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/package.json)
- add scraper dependencies:
  - `axios`
  - `cheerio`

#### [backend/src/config.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/config.ts)
- add scraper config:
  - `SCRAPER_BASE_URL`
  - `SCRAPER_REQUEST_TIMEOUT_MS`
  - `SCRAPER_RETRY_COUNT`
  - `SCRAPER_MIN_DELAY_MS`
  - `SCRAPER_MAX_DELAY_MS`
  - optional `SCRAPER_USER_AGENT`

## Data Flow

### Step 1: start run

- receive category slug or category ID
- load category from DB
- create `ScrapeRun(status = RUNNING)`

### Step 2: fetch pages

- start with category URL
- fetch page HTML via Axios
- delay between requests
- enforce at most 1 request/second overall for this scraper flow
- retry failed requests up to configured retry count

### Step 3: parse page

- load HTML into Cheerio
- find product cards
- parse core fields
- parse next page link
- continue until no next page remains

### Step 3a: deduplicate within the run

Before persistence:
- deduplicate parsed products by normalized `externalUrl`
- if the same product appears multiple times in one run, keep a single canonical parsed record

Reason:
- prevents duplicate counting and duplicate snapshot attempts caused by listing quirks or repeated pagination content

### Step 4: persist results

For each parsed product:
- normalize external URL
- upsert into `Product`
- ensure `ProductCategory` exists
- compare tracked fields to current product state
- if changed:
  - update product
  - create `ProductSnapshot`
  - update `lastSeenAt`
- if unchanged:
  - update `lastSeenAt`

### Step 4a: reconcile products not seen in the run

After all pages are parsed:
- build the set of scraped `externalUrl`s for the category
- load existing products linked to that category through `ProductCategory`
- identify linked products not seen in the current run

Phase 1 rule:
- do not fully implement sold-out state transitions yet
- do not automatically flip `inStock = false` only because a product is absent from the listing
- leave `soldOut = 0` and `backInStock = 0` for Phase 1 runs

Reason:
- absence from a category listing may be caused by site structure changes, temporary filtering behavior, or parsing issues
- this avoids introducing incorrect sold-out state before the dedicated diff logic is implemented

### Step 5: finalize run

- compute:
  - `totalProducts`
  - `newProducts`
  - `priceChanges`
  - `pagesScraped`
- set `durationMs`
- set `completedAt`
- mark `status = COMPLETED`

If any fatal error occurs:
- update the run with `status = FAILED`
- save `errorMessage`

## Parsing Requirements

### Product extraction

For each product card, extract:
- product title
- product page URL
- image URL
- current displayed price
- original price if crossed-out sale price exists
- stock status

### URL normalization

Normalize:
- relative URLs to absolute URLs
- remove duplicate trailing slash issues consistently

Category URL construction rule:
- build category URLs directly from the stored category `slug`
- use the pattern `/tootekategooria/{slug}/`
- do not attempt to reconstruct nested slugs from parent/child DB relationships

### Price normalization

Convert:
- `12,99 €`
- `12.99`
- similar display variants

Into:
- numeric decimal values suitable for Prisma `Decimal`

### Stock normalization

Map page state into:
- `true` for in stock
- `false` for out of stock

Use an explicit rule order based on stable selectors/text patterns.

If stock cannot be determined reliably:
- record it as a parser ambiguity
- fail the affected product parse or the run validation step, depending on severity
- do not silently force `inStock = false`

Deterministic Phase 1 rule:
- if a product is missing a required field such as `externalUrl`, `name`, `currentPrice`, or stock state, skip that product and record a parser warning
- if parser warnings exceed a small threshold for the page or the page yields zero valid products unexpectedly, fail the run

## Pagination Strategy

### Initial scope

Follow the next-page link until:
- no next page exists, or
- the next page URL repeats, or
- a configured hard safety limit is hit

Recommended safety limit:
- `200` pages

Reason:
- avoids infinite loops if the site HTML changes unexpectedly

## Persistence Rules

### Product upsert

On first sighting:
- create `Product`
- create `ProductCategory`
- create initial `ProductSnapshot`
- increment `newProducts`

On later sighting:
- ensure `ProductCategory` exists
- compare state fields
- create snapshot only when needed

### What counts as a change for Phase 1

Track as snapshot-worthy changes:
- current price changed
- original price changed
- stock changed
- product name changed
- image changed

Track as run stats for Phase 1:
- `newProducts`
- `priceChanges`
- `soldOut = 0`
- `backInStock = 0`

Do not fully implement yet:
- `soldOut`
- `backInStock`
- `changeReports`

However:
- store enough state so those can be added later without redesign
- include reconciliation of category-linked products not seen in the run so later diffing has a clear extension point

## Error Handling

### Recoverable errors

- transient fetch failure
- timeout
- temporary non-200 response

Action:
- retry with exponential backoff

### Fatal run errors

- category missing in DB
- parser returns zero products for pages that should contain products and validation indicates site structure likely changed
- repeated fetch failure after retries

Action:
- fail the run
- save `errorMessage`

## Testing Plan

### Unit tests

Add tests for:
- price parsing
- product-card parsing
- pagination detection
- URL normalization
- persistence change detection

Suggested files:
- `backend/src/scraper/parse.test.ts`
- `backend/src/scraper/fetch.test.ts`
- `backend/src/scraper/persist.test.ts`

### Fixtures

Create HTML fixtures for:
- normal category page
- sale-price product
- out-of-stock product
- multi-page category listing
- malformed or changed markup

Suggested fixture location:
- `backend/src/scraper/__fixtures__/`

### Integration tests

Add DB-backed tests for:
- first-time scrape creates products and snapshots
- second identical scrape updates `lastSeenAt` but does not create duplicate snapshots
- changed price creates snapshot
- repeated category membership does not create duplicate `ProductCategory`
- failed run persists `FAILED` status

## Manual Verification Plan

1. Choose one seeded category from the DB
2. Run scraper for that category manually
3. Confirm:
   - one `ScrapeRun` row created
   - products inserted
   - product-category links inserted
   - snapshots inserted for initial products
4. Run the same scraper again without data changes
5. Confirm:
   - no duplicate products
   - no duplicate snapshots for unchanged products
   - `lastSeenAt` advances

## Verification Commands

Expected implementation verification:

```bash
npm run build --workspace=backend
npm run test --workspace=backend
```

If a manual runner is added, document a command such as:

```bash
node --import tsx backend/src/scraper/run.ts
```

or a dedicated npm script.

## Out of Scope For This Phase

- change-report generation
- sold-out/back-in-stock diff logic as a finished feature
- queue workers
- cron scheduling
- admin trigger endpoint
- proxy rotation
- distributed scraping

## Implementation Order

1. Add `axios` and `cheerio`
2. Add scraper config values
3. Implement HTML parsing helpers and fixtures
4. Implement fetch and pagination traversal
5. Implement persistence/change detection
6. Implement scrape-run orchestrator
7. Add unit and integration tests
8. Manually verify against one real category
