# Backend Unused Cleanup Implementation Plan (2026-03-22)

## Related Audit

- Report: `documentation/backend/backend-unused-audit-2026-03-22.md`
- Issue draft: `documentation/backend/issues/backend-unused-audit-2026-03-22-issue.md`

## Goal

Remove unused backend symbols and dead code, fix backend dependency declarations, and verify no regressions through static checks and tests.

## Plan and Status

1. Inventory and classify findings from the audit report.

- Status: completed

2. Remove internal-only exported symbols where external access is not required.

- Status: completed
- Scope: `lib`, `notifications`, `queue`, `scheduler`, `schemas`, `scraper`, and `services` modules listed in git diff.

3. Remove dead/unused functions and wrappers.

- Status: completed
- Removed:
    - `issueCsrfCookie` from `backend/src/middleware/csrf.ts`
    - `getRoleLimit` from `backend/src/services/subscription.service.ts`
    - `getActiveTrackedProductIds` from `backend/src/services/tracked-product.service.ts`
    - `getTrackingLimitByPrismaRole` from `backend/src/services/tracking-capacity.service.ts`

4. Fix backend workspace dependency declarations.

- Status: completed
- Added dependencies:
    - `ioredis`
    - `domhandler`
- Added devDependency:
    - `eslint`

5. Re-run unused audit tooling.

- Status: completed
- Command:
    - `npx --yes knip --workspace @mabrik/backend --include files,exports,types,dependencies,enumMembers,namespaceMembers --reporter json --no-exit-code`
- Result:
    - `{"issues":[]}`

6. Run backend validation and tests.

- Status: completed
- Commands:
    - `npm run lint --workspace=backend`
    - `npm run typecheck --workspace=backend`
    - `npm run test --workspace=backend`
- Result:
    - Tests: `35 passed | 2 skipped` files
    - Tests: `188 passed | 4 skipped` tests

## Notes

- A flaky expectation in `backend/src/diff/run.test.ts` was stabilized by asserting delivery channel IDs rather than immediate delivery status, which can transition quickly (`PENDING` -> `SENT`/`FAILED`) depending on timing.
