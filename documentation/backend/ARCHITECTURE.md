# Backend Architecture

## Purpose

The backend is responsible for:

- authentication and session management
- category scraping
- diff generation
- notification delivery orchestration
- database access and persistence

It is designed as a pragmatic TypeScript service with clear module boundaries around business capabilities rather than a deeply layered framework.

## Tech Stack

### Runtime and framework

- Node.js
- Express 5
- TypeScript

### Data layer

- PostgreSQL
- Prisma ORM

### Scraping and parsing

- Axios
- Cheerio

### Authentication and security

- bcrypt
- JWT
- cookie-parser
- helmet
- cors
- express-rate-limit
- Zod

### Notifications

- Nodemailer for SMTP/local development
- Resend for production email delivery

### Testing

- Vitest
- Supertest

## High-level structure

The backend is organized by capability.

Main folders under [backend/src](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src):

- `controllers`
  - thin request handlers
- `routes`
  - Express route wiring
- `middleware`
  - auth and request pipeline concerns
- `schemas`
  - Zod request validation
- `services`
  - auth business logic
- `scraper`
  - fetch, parse, persist, run orchestration
- `diff`
  - baseline loading, change detection, report persistence
- `notifications`
  - template rendering, transport, immediate sends, digest sends
- `lib`
  - shared infrastructure helpers like Prisma, JWT, cookies, hashing, HTTP
- `test`
  - shared DB/test helpers
- `types`
  - backend-local type augmentation

## Application shell

The HTTP app is created in [backend/src/app.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/app.ts).

Responsibilities:

- configure middleware
- configure CORS
- configure security headers
- configure rate limiting
- mount API routes
- expose health/category endpoints
- handle centralized errors

The process entrypoint is [backend/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/index.ts).

Responsibilities:

- load environment variables
- validate config
- connect Prisma
- start the Express server

This split keeps the app reusable in tests and keeps process startup separate from request wiring.

## Configuration strategy

All backend config is validated in [backend/src/config.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/config.ts).

Key decisions:

- use Zod for environment validation
- fail fast on invalid runtime config
- keep provider-specific email validation explicit with `EMAIL_PROVIDER`
- centralize config access instead of reading `process.env` throughout the codebase

This reduces hidden runtime branching and makes tests more predictable.

## Data access strategy

Prisma is the only ORM/data-access layer.

Shared Prisma client:

- [backend/src/lib/prisma.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/prisma.ts)

Key decisions:

- one shared Prisma client per process
- schema is the source of truth for relational structure
- business modules query Prisma directly where the logic is already capability-scoped

This codebase does not currently use a separate repository layer. That is intentional. The backend is still small enough that capability-local Prisma queries are clearer than adding abstraction for its own sake.

## Authentication architecture

Auth is split across:

- request validation:
  - [backend/src/schemas/auth.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/schemas/auth.ts)
- route wiring:
  - [backend/src/routes/auth.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/routes/auth.ts)
- controllers:
  - [backend/src/controllers/auth.controller.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/controllers/auth.controller.ts)
- service logic:
  - [backend/src/services/auth.service.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/services/auth.service.ts)
- middleware:
  - [backend/src/middleware/auth.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/middleware/auth.ts)
- helper libs:
  - [backend/src/lib/jwt.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/jwt.ts)
  - [backend/src/lib/hash.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/hash.ts)
  - [backend/src/lib/cookies.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/cookies.ts)

Key decisions:

- short-lived JWT access tokens
- opaque refresh tokens stored only as hashes in the database
- refresh-token rotation and revocation
- cookie-based auth transport
- default email notification channel created at registration

This keeps auth state revocable while preserving a simple browser-based login flow.

## Scraper architecture

The scraper lives in [backend/src/scraper](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper).

Core modules:

- [fetch.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/fetch.ts)
  - category URL building
  - page fetching
  - retries
  - politeness delay
- [selectors.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/selectors.ts)
  - DOM selector constants
- [parse.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/parse.ts)
  - HTML parsing and normalization
- [persist.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/persist.ts)
  - canonical product persistence
  - product/category linking
  - state-based snapshot writes
  - scrape stats
- [run.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/scraper/run.ts)
  - end-to-end scrape orchestration

Key decisions:

- canonical `products` table keyed by `external_url`
- many-to-many `product_categories`
- state-based snapshots, not full copies on every run
- request politeness rules baked into fetch flow
- parser supports the live Mabrik archive-template structure

Current flow:

1. create `scrape_run`
2. fetch category pages
3. parse products
4. persist products and changed snapshots
5. complete `scrape_run`
6. trigger diff engine

## Diff engine architecture

The diff engine lives in [backend/src/diff](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/diff).

Core modules:

- [build-baseline.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/diff/build-baseline.ts)
  - load current run snapshots
  - load previous persisted historical snapshots
- [detect.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/diff/detect.ts)
  - pure change detection logic
- [persist.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/diff/persist.ts)
  - create `change_reports`
  - create `change_items`
  - create `notification_deliveries`
  - update `scrape_runs` counters
- [run.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/diff/run.ts)
  - orchestration and idempotency

Key decisions:

- one canonical `change_report` per `scrape_run`
- `new_product` uses `products.first_seen_at` plus current-run snapshots
- historical comparison uses persisted data only
- `sold_out` requires explicit persisted stock transition
- category-local absence is not treated as proof of global sold-out state
- diff execution is idempotent by `scrapeRunId`

This keeps the system aligned with the canonical product model and avoids category-scoped false positives.

## Notification architecture

Notifications live in [backend/src/notifications](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/notifications).

Core modules:

- [templates.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/notifications/templates.ts)
  - immediate email rendering
  - digest email rendering
- [transport.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/notifications/transport.ts)
  - SMTP via Nodemailer
  - Resend transport
- [helpers.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/notifications/helpers.ts)
  - query helpers
  - delivery state updates
- [send-immediate.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/notifications/send-immediate.ts)
  - paid/admin immediate delivery flow
- [send-digest.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/notifications/send-digest.ts)
  - free-user digest flow

Key decisions:

- `notification_deliveries` is the delivery state source of truth
- both paid and free users receive `PENDING` deliveries from the diff engine
- immediate sender processes only paid/admin deliveries
- free-user digest sender processes pending free-user deliveries
- immediate transport failures become `FAILED`
- digest transport failures remain `PENDING`
- deterministic invalid cases become `SKIPPED`
- transport selection is explicit via `EMAIL_PROVIDER`

This preserves a uniform persistence model while allowing role-specific dispatch behavior.

## Error handling strategy

The backend uses centralized request error handling in [backend/src/app.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/app.ts).

Current behavior:

- Zod validation errors become `400`
- known `AppError` instances return their configured status/code
- unknown errors return `500`

Non-HTTP modules such as scraper, diff, and notifications throw normal errors and let orchestration or callers decide whether to persist failure state.

## Testing strategy

The backend uses Vitest for both pure logic tests and DB-backed integration tests.

Shared test helpers:

- [backend/src/test/setup.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/setup.ts)
- [backend/src/test/db.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/db.ts)
- [backend/src/test/factories.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/test/factories.ts)

Current coverage areas:

- auth
- JWT/cookies/helpers
- scraper parsing and persistence
- diff detection and orchestration
- notification templates
- immediate delivery flow
- digest flow

Key decisions:

- keep pure logic isolated enough for unit tests
- use a real local PostgreSQL database for DB-backed integration tests
- disable test parallelism to avoid DB cross-test interference

## Major architectural decisions

### 1. Capability-oriented modules instead of framework-heavy layering

The backend is organized around business capabilities:

- auth
- scraper
- diff
- notifications

This keeps related logic together and makes the system easier to navigate.

### 2. Canonical product model

Products are global canonical records keyed by external URL.

Why:

- avoids duplicates
- supports multi-category membership
- makes history and notifications consistent across scrapes

### 3. Canonical diff model

Diffs are created once per scrape run, then delivered to many users.

Why:

- avoids payload duplication
- cleanly separates change detection from notification delivery
- supports future delivery channels

### 4. State-based snapshots

Snapshots are only stored when product state changes.

Why:

- keeps history useful without explosive growth
- matches the core need: tracking price and stock transitions

Tradeoff:

- diff baseline logic must rely on persisted historical snapshots carefully

### 5. Explicit transport/provider selection

Email provider selection uses `EMAIL_PROVIDER`.

Why:

- clearer than inferring from `NODE_ENV`
- easier to run staging/preview configurations
- operationally safer

## Current limitations

Not yet implemented:

- payment/webhook flows
- notification channel CRUD beyond the default registration path
- frontend integration for most backend capabilities

The current architecture is intentionally service-first and backend-heavy. That is appropriate at this stage because the highest-risk work has been data correctness, scraping, diffing, and delivery semantics.
