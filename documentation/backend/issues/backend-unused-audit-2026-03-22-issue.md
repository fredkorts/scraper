# Issue Draft: Backend audit - unused code and dependency cleanup

## Summary

Backend audit found a set of internal-only exported symbols, one likely false-positive unused file, and missing direct dependencies in `backend/package.json`.

## Report

- `documentation/backend/backend-unused-audit-2026-03-22.md`

## Proposed Tasks

- [ ] Remove unnecessary `export` modifiers from internal-only symbols.
- [ ] Remove or wire `issueCsrfCookie` in `backend/src/middleware/csrf.ts`.
- [ ] Add missing dependencies to backend workspace:
    - [ ] `ioredis`
    - [ ] `domhandler`
    - [ ] `eslint` (devDependency for backend lint scripts)
- [ ] Confirm `backend/eslint.config.js` should remain (likely config-file false positive).
- [ ] Re-run knip after cleanup and attach before/after diff in issue comments.

## Suggested GitHub issue URL

- https://github.com/fredkorts/scraper/issues/new?title=Backend%20audit%3A%20unused%20code%20and%20dependency%20cleanup&body=See%20audit%20report%3A%20documentation%2Fbackend%2Fbackend-unused-audit-2026-03-22.md
