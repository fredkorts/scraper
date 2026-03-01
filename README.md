# Mabrik Scraper

Price-monitoring system for `mabrik.ee` with a Node/Express backend, PostgreSQL + Prisma data layer, and React/Vite dashboard.

## Workspace

This repo is an npm workspace monorepo:

- `backend`: Express API, Prisma schema, seed scripts
- `frontend`: React dashboard
- `shared`: shared types and constants

## Stack

- Backend: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL 16
- Queue/cache: Redis
- Frontend: React, Vite, TypeScript

## Requirements

- Node.js `20+`
- npm
- Docker Desktop or another working Docker daemon

## Environment

Copy `.env.example` to `.env` and set the values you want to use locally.

Required variables:

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`

## Local Setup

Install dependencies:

```bash
npm install
```

Start Postgres and Redis:

```bash
docker compose up -d db redis
```

Apply migrations:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Seed category data:

```bash
DATABASE_URL='postgresql://mabrik:mabrik@localhost:5432/mabrik_scraper?schema=public' node --import tsx backend/prisma/seed.ts
```

Start the app:

```bash
npm run dev
```

This runs:

- backend on `http://localhost:3001`
- frontend on Vite's default local port

## Useful Commands

Root:

```bash
npm run dev
npm run build
npm run lint
```

Backend:

```bash
npm run dev --workspace=backend
npm run build --workspace=backend
npm run test --workspace=backend
npm run seed --workspace=backend
npm run prisma:generate --workspace=backend
npm run prisma:studio --workspace=backend
```

Frontend:

```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
```

Shared:

```bash
npm run build --workspace=shared
```

## Backend Tests

The backend test suite uses Vitest and runs against the local PostgreSQL database.

Before running tests:

```bash
docker compose up -d db redis
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Run backend tests:

```bash
npm run test --workspace=backend
```

The auth tests reset the auth-related tables before each run, so do not point `DATABASE_URL` at a database you want to preserve.

## Database Notes

Prisma schema:

- [schema.prisma](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/schema.prisma)

Category seed:

- [seed.ts](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/backend/prisma/seed.ts)

Local services:

- [docker-compose.yml](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/docker-compose.yml)

If the initial schema is ever applied manually from SQL instead of through Prisma Migrate, baseline that migration before running `prisma migrate deploy`:

```bash
npx prisma migrate resolve --applied 20260301000000_init --schema backend/prisma/schema.prisma
```

Without that step, Prisma will fail with `P3005` because the database schema is non-empty but Prisma does not yet have matching migration history in `_prisma_migrations`.

## Current Status

Implemented foundation:

- monorepo workspace structure
- backend Prisma integration
- PostgreSQL schema and initial migration
- auth endpoints and auth test suite
- category seed script
- local Docker setup for Postgres and Redis

Not implemented yet:

- scraper logic
- diff engine
- notifications
- payments
- dashboard application features

## Project Docs

- [REQUIREMENTS.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/REQUIREMENTS.md)
- [DB_IMPLEMENTATION.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/DB_IMPLEMENTATION.md)
