# Implementation Plan - Backend Database Foundation

This plan defines the backend and database work needed for the project foundation. It is intentionally narrower and more explicit than the original draft: it resolves the data-model ambiguities from `REQUIREMENTS.md` and focuses on a schema that will support auth, scraping, diffing, notification delivery, and future expansion without early rework.

## Scope

This plan covers:
- PostgreSQL local infrastructure
- Prisma setup and initial migration
- Initial backend wiring for Prisma and config validation
- Seed data for categories
- Core database schema for auth, scraping, change tracking, and notifications

This plan does not cover:
- Scraper implementation
- Diff engine implementation
- Email template/content work
- PayPal API integration
- Bull worker implementation

## Design Decisions

### 1. Change Tracking Model

Use a canonical scrape diff model:
- Each scrape run produces at most one canonical `ChangeReport`
- The concrete changes live in `ChangeItem`
- User-specific delivery state is stored separately in `NotificationDelivery`

Reason:
- The diff is a system fact, not a user-specific artifact
- This avoids duplicating identical change payloads for every subscribed user
- Retry and multi-channel support become straightforward

### 2. Product and Category Model

Use a canonical product model with many-to-many category membership:
- `Product` is unique by `externalUrl`
- `ProductCategory` links products to one or more categories

Reason:
- WooCommerce products can appear in multiple categories or sale groupings
- A single `categoryId` on `Product` would either lose relationships or create overwrite conflicts

### 3. Auth Session Model

Use short-lived access tokens with DB-backed refresh tokens:
- Access token stays in an `HttpOnly` cookie
- Refresh tokens are stored hashed in a `RefreshToken` table

Reason:
- This matches the security requirements in the PRD
- It enables revocation, rotation, logout, and session expiration tracking

## Proposed Changes

### Backend Setup

#### [MODIFY] [backend/package.json](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/package.json)
- Add dependencies:
  - `prisma`
  - `@prisma/client`
  - `zod`
  - `helmet`
  - `express-rate-limit`
  - `bcrypt`
  - `cookie-parser`
  - `jsonwebtoken`
- Add devDependencies:
  - `@types/bcrypt`
  - `@types/cookie-parser`
  - `@types/jsonwebtoken`
- Add scripts:
  - `prisma:generate`
  - `prisma:migrate`
  - `prisma:studio`
  - `seed`

#### [NEW] [backend/src/config.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/config.ts)
- Validate required environment variables with Zod
- Fail fast on invalid startup configuration
- Expected variables at minimum:
  - `PORT`
  - `NODE_ENV`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
  - `FRONTEND_URL`

#### [NEW] [backend/src/lib/prisma.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/prisma.ts)
- Export a shared Prisma client instance
- Ensure clean reuse in development

#### [MODIFY] [backend/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/index.ts)
- Integrate `helmet`
- Restrict CORS to the configured frontend origin
- Add `express-rate-limit`
  - Standard API limiter
  - Stricter limiter for `/api/auth/*`
  - Stricter limiter for `/api/payments/*`
- Add `cookie-parser`
- Import validated config instead of reading raw env directly
- Initialize Prisma on app startup
- Keep `/api/health` working

### Local Infrastructure

#### [NEW] [docker-compose.yml](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/docker-compose.yml)
- Define `db` service using `postgres:16-alpine`
- Define `redis` service for future Bull usage
- Configure persistent Postgres volume
- Expose local development ports only

#### [NEW] [.env.example](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/.env.example)
- Document required backend environment variables
- Include local defaults for Postgres and Redis connection strings

### Prisma Schema

#### [NEW] [backend/prisma/schema.prisma](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/schema.prisma)
- Define models, enums, relations, constraints, and indexes for the initial schema

### Seed Data

#### [NEW] [backend/prisma/seed.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/seed.ts)
- Seed `Category` from `MABRIK_CATEGORIES` in `@mabrik/shared`
- Make the seed idempotent using upserts
- Populate parent/child category relationships where applicable

## Initial Schema

### Enums

- `UserRole`: `FREE`, `PAID`, `ADMIN`
- `ScrapeRunStatus`: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`
- `ChangeType`: `PRICE_INCREASE`, `PRICE_DECREASE`, `NEW_PRODUCT`, `SOLD_OUT`, `BACK_IN_STOCK`
- `NotificationChannelType`: `EMAIL`, `DISCORD`, `WHATSAPP`, `SIGNAL`, `SMS`
- `NotificationDeliveryStatus`: `PENDING`, `SENT`, `FAILED`, `SKIPPED`

### Models

#### `User`

Purpose:
- Registered user account and subscription tier state

Core fields:
- `id`
- `email`
- `passwordHash`
- `name`
- `role`
- `lastDigestSentAt`
- `paypalSubscriptionId`
- `subscriptionExpiresAt`
- `isActive`
- `createdAt`
- `updatedAt`

Constraints and indexes:
- Unique: `email`

#### `RefreshToken`

Purpose:
- Persistent session and refresh-token revocation store

Core fields:
- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `revokedAt`
- `revocationReason`
- `replacedByTokenId`
- `createdAt`

Constraints and indexes:
- Index: `userId`
- Index: `expiresAt`
- Unique: `tokenHash`

Notes:
- Store only a hash, not the raw refresh token
- `replacedByTokenId` supports refresh-token rotation lineage
- `revocationReason` distinguishes normal logout from security-driven revocation

#### `Category`

Purpose:
- Reference list of scraper categories and subcategories

Core fields:
- `id`
- `slug`
- `nameEt`
- `nameEn`
- `parentId`
- `isActive`
- `scrapeIntervalHours`
- `nextRunAt`
- `createdAt`
- `updatedAt`

Constraints and indexes:
- Unique: `slug`
- Index: `nextRunAt`
- Index: `parentId`

#### `UserSubscription`

Purpose:
- Links users to tracked categories

Core fields:
- `id`
- `userId`
- `categoryId`
- `isActive`
- `createdAt`

Constraints and indexes:
- Unique composite: `userId`, `categoryId`
- Index: `categoryId`

#### `ScrapeRun`

Purpose:
- Tracks each category scrape attempt and high-level outcomes

Core fields:
- `id`
- `categoryId`
- `status`
- `totalProducts`
- `newProducts`
- `priceChanges`
- `soldOut`
- `backInStock`
- `pagesScraped`
- `durationMs`
- `errorMessage`
- `startedAt`
- `completedAt`

Constraints and indexes:
- Index: `categoryId`
- Index: `status`
- Index: `startedAt`

#### `Product`

Purpose:
- Canonical product registry keyed by Mabrik product URL

Core fields:
- `id`
- `externalUrl`
- `name`
- `imageUrl`
- `currentPrice`
- `originalPrice`
- `inStock`
- `firstSeenAt`
- `lastSeenAt`
- `updatedAt`

Constraints and indexes:
- Unique: `externalUrl`
- Index: `lastSeenAt`
- Index: `inStock`

Notes:
- This table stores the latest known state only
- Category membership is handled through `ProductCategory`

#### `ProductCategory`

Purpose:
- Many-to-many relationship between products and categories

Core fields:
- `id`
- `productId`
- `categoryId`
- `createdAt`

Constraints and indexes:
- Unique composite: `productId`, `categoryId`
- Index: `categoryId`

#### `ProductSnapshot`

Purpose:
- Historical state changes for products over time

Core fields:
- `id`
- `scrapeRunId`
- `productId`
- `name`
- `price`
- `originalPrice`
- `inStock`
- `imageUrl`
- `scrapedAt`

Constraints and indexes:
- Index: `scrapeRunId`
- Index: `productId`
- Index: `scrapedAt`

Notes:
- Snapshot rows are created only when tracked state changes
- This supports price history charts without storing duplicate unchanged rows

#### `ChangeReport`

Purpose:
- Canonical diff summary for a scrape run

Core fields:
- `id`
- `scrapeRunId`
- `totalChanges`
- `createdAt`

Constraints and indexes:
- Unique: `scrapeRunId`

Notes:
- One report per scrape run at most
- This model contains no `userId`

#### `ChangeItem`

Purpose:
- Individual change entries belonging to a canonical change report

Core fields:
- `id`
- `changeReportId`
- `productId`
- `changeType`
- `oldPrice`
- `newPrice`
- `oldStockStatus`
- `newStockStatus`

Constraints and indexes:
- Index: `changeReportId`
- Index: `productId`
- Index: `changeType`

#### `NotificationChannel`

Purpose:
- User-configured notification destinations

Core fields:
- `id`
- `userId`
- `channelType`
- `destination`
- `isDefault`
- `isActive`
- `createdAt`

Constraints and indexes:
- Index: `userId`
- Unique composite: `userId`, `channelType`, `destination`

Notes:
- Day one uses `EMAIL`
- Future channels reuse the same model
- Prevent duplicate identical destinations for the same user and channel type

#### `NotificationDelivery`

Purpose:
- Tracks delivery of a canonical change report to a specific user and channel

Core fields:
- `id`
- `changeReportId`
- `userId`
- `notificationChannelId`
- `status`
- `errorMessage`
- `sentAt`
- `createdAt`

Constraints and indexes:
- Index: `changeReportId`
- Index: `userId`
- Index: `status`
- Unique composite: `changeReportId`, `userId`, `notificationChannelId`

Notes:
- This is the correct place for per-user delivery state
- Immediate paid notifications and free digests can both build on this model

## Relation and Constraint Notes

### Cascade behavior

Set Prisma relation behavior deliberately:
- Deleting a `User` should cascade to:
  - `RefreshToken`
  - `UserSubscription`
  - `NotificationChannel`
  - `NotificationDelivery`
- Deleting a `Category` should be restricted if scrape history exists
- Deleting a `Product` should be restricted if snapshots or change items exist

### Numeric fields

Use Prisma `Decimal` for all price fields:
- `currentPrice`
- `originalPrice`
- `price`
- `oldPrice`
- `newPrice`

### Timestamps

Use `createdAt @default(now())` consistently and `updatedAt @updatedAt` where mutable rows require it.

## Implementation Order

### 1. Infrastructure
- Add `docker-compose.yml`
- Add `.env.example`
- Start local Postgres and Redis

### 2. Backend Dependencies
- Update [backend/package.json](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/package.json)
- Install Prisma, auth, validation, and middleware packages

### 3. App Config
- Add [backend/src/config.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/config.ts)
- Add [backend/src/lib/prisma.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/lib/prisma.ts)
- Update [backend/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/index.ts)

### 4. Prisma Schema
- Create [backend/prisma/schema.prisma](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/schema.prisma)
- Encode all enums, relations, indexes, and unique constraints listed above

### 5. Initial Migration
- Run `prisma generate`
- Run `prisma migrate dev --name init`
- Review generated SQL before treating the migration as final

### 6. Seed Categories
- Create [backend/prisma/seed.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/seed.ts)
- Seed categories via upsert from shared reference data

## Verification Plan

### Automated Verification

- Run backend TypeScript build:
  - `npm run build`
- Validate Prisma schema:
  - `npx prisma validate`
- Generate client:
  - `npx prisma generate`
- Apply local migration:
  - `npx prisma migrate dev --name init`
- Run seed script:
  - `npm run seed`

### Database Verification

Confirm the following in Postgres or Prisma Studio:
- Categories were inserted once only after repeated seed runs
- Parent/child category relationships are correct
- Unique constraints work for:
  - `users.email`
  - `categories.slug`
  - `products.externalUrl`
  - `user_subscriptions(userId, categoryId)`
  - `product_categories(productId, categoryId)`
  - `notification_deliveries(changeReportId, userId, notificationChannelId)`
- Index-backed lookup paths exist for scheduler, subscriptions, scrape history, snapshots, and notification delivery queries

### Manual Verification

- Verify [backend/src/index.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/src/index.ts) still serves `GET /api/health`
- Verify CORS rejects non-configured origins
- Verify `helmet` headers are present
- Verify the app fails fast if required env vars are missing

## Migration Note

If the initial schema is ever applied manually, or via raw SQL outside Prisma Migrate, the database must be baselined before `prisma migrate deploy` will work cleanly.

Use:
- `npx prisma migrate resolve --applied 20260301000000_init --schema backend/prisma/schema.prisma`

Reason:
- Prisma requires the `_prisma_migrations` history table to reflect already-applied migrations
- Without that baseline, `prisma migrate deploy` will fail with `P3005` because the schema is non-empty but unmanaged from Prisma's perspective

## Non-Goals for This Phase

Do not add these yet:
- Scraper jobs
- Diff engine business logic
- PayPal webhook handlers
- Email sending
- Digest compilation logic

Those depend on this schema, but they should be implemented after the migration and seed layer are stable.
