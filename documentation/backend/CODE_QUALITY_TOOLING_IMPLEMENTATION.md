# Code Quality Tooling Implementation Plan

## Status

Implemented (March 7, 2026).

## Goal

Establish a consistent, enforceable code-quality baseline across all workspaces:

1. `backend`
2. `frontend`
3. `shared`

Tooling in scope:

1. ESLint
2. Prettier
3. Stylelint
4. Git hooks (Husky + lint-staged)

## Current State

1. ESLint exists for `backend` and `frontend`.
2. `shared` has no real lint setup yet.
3. Prettier is not configured.
4. Stylelint is not configured.
5. Git hooks are not configured.

## Target State

1. ESLint runs in all three workspaces (`backend`, `frontend`, `shared`).
2. Prettier is repo-wide and applied to staged TS/TSX/JS files and docs/config.
3. Stylelint enforces SCSS/CSS quality in frontend style files with CSS Modules compatibility.
4. Pre-commit hook validates staged changes quickly.
5. Pre-push hook runs fast deterministic repo quality gates.
6. CI runs authoritative full checks (lint, typecheck, tests, builds).

## Design Decisions

1. Keep existing per-workspace ESLint flat configs for `backend` and `frontend`.
2. Add `shared/eslint.config.js` using TypeScript ESLint flat config.
3. Use one root Prettier config and ignore file.
4. Run Stylelint primarily on frontend style files.
5. Use workspace-aware lint-staged commands (avoid ambiguous root `eslint --fix`).
6. Add explicit `typecheck` scripts and treat typecheck as a quality gate.
7. Keep pre-commit fast; keep heavier checks in pre-push/CI.
8. Keep scripts explicit and workspace-safe.

## Folder-by-Folder Plan

### Backend

1. Keep `backend/eslint.config.js`; tighten rules only where stable.
2. Add backend formatting coverage under root Prettier config.
3. Keep backend `lint` script as `eslint .`.
4. Add backend `typecheck` script (`tsc --noEmit`).
5. Include backend files in staged lint+format checks.

### Frontend

1. Keep `frontend/eslint.config.js`.
2. Add Stylelint coverage for:
    - `frontend/src/**/*.scss`
    - `frontend/src/**/*.css` (if present)
3. Apply Prettier to TS/TSX/JSON/MD and CSS/SCSS formatting.
4. Add frontend `typecheck` script (`tsc -b --noEmit` or equivalent).
5. Ensure frontend staged linting remains quick.

### Shared

1. Add `shared/eslint.config.js`.
2. Replace placeholder lint script with real ESLint command.
3. Add shared `typecheck` script (`tsc --noEmit`).
4. Include shared files in staged lint+format checks.

## Repo-Level Implementation Steps

### Phase 1: Base Config Files

Create:

1. `.prettierrc` (or `prettier.config.cjs`)
2. `.prettierignore`
3. `stylelint.config.cjs`
4. `.stylelintignore`
5. `shared/eslint.config.js`

Stylelint config requirements:

1. SCSS-aware setup.
2. CSS Modules compatibility (`:global(...)` patterns and module usage).
3. Rules tuned to current token/mixin architecture to avoid noisy false positives.

### Phase 2: Package Scripts and Dependencies

Add root dev dependencies:

1. `prettier`
2. `stylelint`
3. `stylelint-config-standard-scss`
4. `husky`
5. `lint-staged`

Add/adjust root scripts:

1. `format`: `prettier --write .`
2. `format:check`: `prettier --check .`
3. `lint:styles`: stylelint command scoped to frontend style files
4. `lint`: workspace ESLint lint + stylelint
5. `typecheck`: run typecheck for `frontend`, `backend`, and `shared`
6. `prepare`: `husky`

Update `shared/package.json`:

1. `lint`: `eslint .`
2. `typecheck`: `tsc --noEmit`

### Phase 3: Git Hooks

Initialize Husky and add:

1. `.husky/pre-commit`
    - run `lint-staged`
2. `.husky/pre-push`
    - run fast broader checks:
        - `npm run lint`
        - `npm run typecheck`
        - `npm run test --workspace=frontend`

`lint-staged` rules (root `package.json`):

1. `frontend/**/*.{ts,tsx,js,jsx,mjs,cjs}` -> frontend eslint fix + prettier write
2. `backend/**/*.{ts,tsx,js,jsx,mjs,cjs}` -> backend eslint fix + prettier write
3. `shared/**/*.{ts,tsx,js,jsx,mjs,cjs}` -> shared eslint fix + prettier write
4. `frontend/src/**/*.{scss,css}` -> `stylelint --fix` then `prettier --write`
5. `*.{json,md,yml,yaml}` -> `prettier --write`

## Testing Strategy

1. Pre-commit:
    - staged-only checks for speed.
2. Pre-push:
    - `lint`, `typecheck`, and selected fast tests.
3. CI:
    - full authoritative checks:
        - lint
        - typecheck
        - tests
        - builds

Backend pre-push note:

1. DB-backed backend tests are environment-sensitive.
2. Keep DB-dependent tests out of local pre-push by default; run them in CI with explicit DB provisioning.

## Rule and Quality Policy

1. Prettier defines canonical formatting.
2. ESLint errors block commit/push.
3. Stylelint enforces frontend style discipline.
4. Hook failures must be actionable and clear.
5. Prettier must run on staged TS/TSX/JS and docs/config files.

## Rollout Safety

1. Add configs/scripts first, then run one controlled format pass.
2. Keep initial rules pragmatic to avoid churn.
3. If rule noise is high, use narrow temporary suppressions with explicit TODO ownership.
4. Keep pre-commit fast.
5. Keep pre-push within a defined runtime budget; heavy checks stay in CI.

## Acceptance Criteria

1. `npm run lint` passes from root and includes all workspaces plus style linting.
2. `npm run format:check` passes.
3. `npm run typecheck` passes across `frontend`, `backend`, and `shared`.
4. `shared` has real ESLint config and a passing lint script.
5. Pre-commit hook runs and blocks invalid staged changes.
6. Pre-push hook runs and blocks failing broader checks.
7. `README.md` includes a concise tooling section and hook behavior.

## Deliverables

1. New config files:
    - Prettier config/ignore
    - Stylelint config/ignore
    - `shared/eslint.config.js`
2. Updated `package.json` scripts/dependencies (root + workspace updates).
3. Husky hook files.
4. `lint-staged` config.
5. Root/workspace `typecheck` scripts.
6. README updates.

## Suggested Execution Order

1. Add configs + scripts.
2. Add Husky + lint-staged hooks.
3. Run one-time format pass.
4. Fix lint/stylelint/typecheck findings.
5. Run full verification:
    - `npm run lint`
    - `npm run format:check`
    - `npm run typecheck`
    - `npm run test --workspace=frontend`
    - `npm run build --workspaces`
6. Update docs.
