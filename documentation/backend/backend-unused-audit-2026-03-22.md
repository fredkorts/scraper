# Backend Unused-Code Audit (2026-03-22)

## Scope

- Folder: `backend/`
- Requested categories: unused files, exports, types, dependencies, enum/class members

## Method

- Tooling: `knip` (workspace-scoped to `@mabrik/backend`)
- Commands run:
    - `npx --yes knip --workspace @mabrik/backend --files --reporter json --no-exit-code`
    - `npx --yes knip --workspace @mabrik/backend --exports --reporter json --no-exit-code`
    - `npx --yes knip --workspace @mabrik/backend --dependencies --reporter json --no-exit-code`
- Follow-up validation:
    - repo-wide symbol search with `rg`
    - manual pass on class private members

## Findings

### 1) Unused file candidates

- `backend/eslint.config.js`
    - Status: likely false positive for knip (config file, not runtime import)
    - Action: keep if backend lint still uses this file

### 2) Unused export candidates

- `backend/src/scraper/robots.ts`
    - `getRobotsPolicy`
- `backend/src/services/category-catalog.service.ts`
    - `normalizeCategorySlug`
    - `fetchCategoryCatalogHtml`
- `backend/src/notifications/change-grouping.ts`
    - `NOTIFICATION_CHANGE_SECTION_LABELS`
    - `sortItemsForCategory`
- `backend/src/lib/trusted-origins.ts`
    - `trustedOriginSet`
- `backend/src/middleware/csrf.ts`
    - `issueCsrfCookie`
- `backend/src/services/subscription.service.ts`
    - `getRoleLimit`
- `backend/src/services/tracked-product.service.ts`
    - `getActiveTrackedProductIds`

Notes:

- These symbols are referenced internally in their defining files but have no external imports in repo-wide search.
- High-confidence cleanup is to remove `export` (or remove dead wrapper where applicable, e.g. `issueCsrfCookie`).

### 3) Unused type export candidates

- `backend/src/services/category-catalog.service.ts`
    - `DiscoveredCategory`
    - `CategoryCatalogRefreshSummary`
- `backend/src/notifications/change-grouping.ts`
    - `ChangeSectionSummary`
- `backend/src/scheduler/enqueue-due-categories.ts`
    - `EnqueueDueCategoriesResult`
- `backend/src/scraper/preorder.ts`
    - `PreorderClassification`
- `backend/src/lib/jwt.ts`
    - `AccessTokenPayload`
- `backend/src/schemas/auth.ts`
    - `RegisterInput`
    - `LoginInput`
- `backend/src/queue/enqueue.ts`
    - `EnqueueResultStatus`
    - `EnqueueScrapeCategoryResult`
- `backend/src/services/google-oauth.service.ts`
    - `GoogleIdentityClaims`

### 4) Dependency issues

- Unlisted dependencies (imported in backend source, missing from `backend/package.json`):
    - `ioredis`
    - `domhandler`
- Missing binary declaration in workspace:
    - `eslint` used by backend scripts but not declared in backend workspace `devDependencies`
    - currently likely resolved via hoisting from other workspaces

### 5) Enum/class member status

- Knip export pass reported:
    - `enumMembers`: none
    - `namespaceMembers`: none
- Manual class-member review:
    - private members in `backend/src/lib/logger.ts` and `backend/src/middleware/rate-limit/redis-store.ts` appear used
    - no high-confidence unused class members found

## Recommended Actions

- Remove unnecessary `export` modifiers from internal-only symbols listed above.
- Remove dead wrapper `issueCsrfCookie` or wire it where intended.
- Add missing backend dependencies:
    - `ioredis` (dependency)
    - `domhandler` (dependency or devDependency depending runtime usage policy)
    - `eslint` (devDependency in backend workspace for script portability)
- Keep `backend/eslint.config.js` unless lint tooling is being migrated.

## Issue Link

- Draft GitHub issue URL (prefilled):
    - https://github.com/fredkorts/scraper/issues/new?title=Backend%20audit%3A%20unused%20code%20and%20dependency%20cleanup&body=See%20audit%20report%3A%20documentation%2Fbackend%2Fbackend-unused-audit-2026-03-22.md

## Issue Publishing Note

- `gh auth status` returned not authenticated in this environment, so the issue was prepared as a draft URL rather than posted directly.
