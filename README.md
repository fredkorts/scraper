# PricePulse

PricePulse is a full-stack price tracking platform for products on `mabrik.ee`.

Live site: [https://pricepulse.site](https://pricepulse.site)

## What It Does

- Scrapes categories and product snapshots
- Detects price/stock changes between runs
- Stores run history and product history
- Provides a frontend dashboard for runs, changes, and product detail views
- Sends notification events (email channels currently implemented)

## Monorepo Structure

- `frontend` - React + Vite application
- `backend` - Node.js + Express + Prisma API and scraper runtime
- `shared` - shared types/constants used by frontend and backend

## Tech Stack

- Node.js 20+
- TypeScript
- React + Vite + Ant Design
- Express
- PostgreSQL + Prisma
- Redis (queue + scrape lock backend)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create backend environment file:

```bash
cp backend/.env.example backend/.env
```

3. Update `backend/.env` with valid values, especially:

- `DATABASE_URL` (default local Postgres works with compose)
- `REDIS_URL` (default local Redis works with compose)
- `JWT_SECRET` (min 32 chars)
- `JWT_REFRESH_SECRET` (min 32 chars)
- `FRONTEND_URL` and `FRONTEND_ORIGINS`

4. Start local infrastructure:

```bash
docker compose up -d db redis
```

5. Apply database migrations:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

6. Seed categories:

```bash
npm run seed --workspace=backend
```

7. Run frontend + backend:

```bash
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Useful Commands

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test --workspace=frontend`
- `npm run test --workspace=backend`
- `npm run scrape:category --workspace=backend -- <categorySlug>`
- `npm run queue:worker --workspace=backend`
- `npm run queue:scheduler --workspace=backend`

Example scrape:

```bash
npm run scrape:category --workspace=backend -- kaardimangud/magic-the-gathering
```
