# AGENTS.md

## Purpose

This file defines the default repo-specific instructions for working in this project.

The project is a Mabrik price-monitoring system with:

- backend: Express + Prisma + PostgreSQL + Bull/Redis
- frontend: React + Vite + TanStack Router + TanStack Query + TanStack Table
- shared contracts: `shared/`
- primary project roadmap and source of truth: `REQUIREMENTS.md`

These instructions apply by default for all work in this repository.

## Always Follow

- Keep changes aligned with the roadmap and implementation docs.
- Prefer updating the code, tests, and docs together in the same pass.
- Do not leave docs stale when implementation meaningfully changes behavior or architecture.
- Do not introduce parallel patterns when an established project pattern already exists.
- Preserve existing user changes; never revert unrelated work.

## Editing Rules

- Prefer `apply_patch` for manual file edits.
- Use ASCII by default unless a file already clearly requires non-ASCII.
- Keep comments sparse and useful.
- Do not perform broad refactors unless the task actually requires them.
- Do not make visual redesigns during architecture cleanup work unless explicitly requested.

## Safety Rules

- Never use destructive commands like `git reset --hard` or `git checkout --` unless explicitly requested.
- If unexpected third-party or user changes appear in files you are actively modifying, stop and ask before proceeding.
- Do not overwrite implementation plans or requirements docs without first reading the current version.

## Backend Rules

- Keep backend contracts, controllers, services, schemas, and shared types in sync.
- If a backend response shape changes, update:
    - backend zod/prisma/service code
    - shared types in `shared/src/index.ts`
    - frontend runtime schemas and queries if they consume that shape
- Protected data must respect the existing authorization model:
    - `free` and `paid` users only see data for actively tracked categories
    - `admin` can see all relevant data
- Prefer returning `404` for inaccessible protected resource ids where enumeration risk exists.
- Validate request params and query params explicitly with Zod.

## Frontend Rules

- Use TanStack Router search params as the source of truth for URL-backed view state.
- Use TanStack Query for server state; do not introduce ad hoc global client state.
- Keep runtime response validation in frontend schemas for important API payloads.
- Reuse the shared `DataTable` and existing query-key conventions where applicable.
- For new routes, prefer route-level loaders/prefetch that match the current router pattern.
- When adding frontend features, update tests for:
    - route behavior
    - URL/search state behavior
    - core rendering and accessibility states

## Styling Rules

- Follow `STYLING_ARCHITECTURE_IMPLEMENTATION.md`.
- CSS Modules remain the default for local styling.
- Global SCSS is for tokens, mixins, primitives, and layout scaffolding only.
- Replace hardcoded reusable values with existing tokens whenever possible.
- Add new tokens only when they represent real repeated design intent.
- Reuse shared style primitives for forms, tables, status badges, cards, and empty/error states.
- Do not bypass CSS Modules by adding large sets of global utility classes.

## Testing Rules

- After meaningful frontend changes, run:
    - `npm run build --workspace=frontend`
    - `npm run lint --workspace=frontend`
    - `npm run test --workspace=frontend`
- After meaningful backend changes, run the relevant backend build/tests and lint.
- If backend tests require Postgres access, say so clearly and run them against the real local DB when available.
- DB-backed backend tests must use `TEST_DATABASE_URL`, never the development `DATABASE_URL`.
- Do not claim work is complete if verification has not been run, unless blocked; if blocked, state the blocker explicitly.

## Docs Sync Rules

- `REQUIREMENTS.md` is the primary roadmap and must stay current.
- When a planned feature is implemented, update the relevant checkboxes and status notes.
- Keep implementation docs in sync when their scope is completed or materially changed:
    - `DB_IMPLEMENTATION.md`
    - `USER_OPERATIONS_IMPLEMENTATION.md`
    - `USER_AUTH_TESTING.md`
    - `BASIC_SCRAPER_IMPLEMENTATION.md`
    - `DIFF_ENGINE_IMPLEMENTATION.md`
    - `EMAIL_FLOW_IMPLEMENTATION.md`
    - `JOB_MANAGEMENT_IMPLEMENTATION.md`
    - `CRUD_API_IMPLEMENTATION.md`
    - `FRONTEND_FOUNDATION_IMPLEMENTATION.md`
    - `SCRAPE_VIEWS_IMPLEMENTATION.md`
    - `FURTHER_IMPLEMENTATIONS.md`
    - `STYLING_ARCHITECTURE_IMPLEMENTATION.md`
- If a doc becomes a historical record rather than a future plan, mark that clearly with a `Status` section.

## Workflow Preferences

- Before substantial work, read the relevant source files and docs first.
- Prefer small, coherent passes:
    - understand
    - implement
    - verify
    - sync docs
- When there are natural next steps, suggest them as a short numbered list.

## Repo Conventions

- Backend code lives in `backend/`
- Frontend code lives in `frontend/`
- Shared types/contracts live in `shared/`
- Documentation and plans live under `documentation/backend/` and `documentation/frontend/`

When in doubt, prefer consistency with the existing implementation over novelty.
