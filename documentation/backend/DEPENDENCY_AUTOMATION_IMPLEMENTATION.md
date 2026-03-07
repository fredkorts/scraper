# Dependency Automation Implementation Plan (Repository-Event Driven)

## Status

Implemented (Phase 1 complete).

## Implementation Snapshot

Completed in repository:

1. Renovate policy config added:
    - [renovate.json](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/.github/renovate.json)
2. Project documentation updated:
    - [README.md](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/documentation/backend/README.md)

Operational follow-up still required in GitHub settings:

1. install/enable Renovate GitHub App for this repository
2. configure branch protection required checks once CI job names are finalized

## Summary

Set up automated dependency update PRs so security and maintenance updates do not rely on manual checks.

Because you prefer **repository-event-driven behavior**, this plan uses **Renovate (GitHub App)** as the primary solution. Renovate can react to repository events (push/merge/webhooks) and keep update PRs current without waiting only for scheduled scans.

## Why Renovate (vs Dependabot)

1. Dependabot security updates are event-driven from GitHub advisories, but regular version updates are schedule-based.
2. Renovate supports richer grouping/rules and event-driven processing via app/webhook behavior.
3. Renovate is better for monorepo/workspace policy control (root + `backend` + `frontend` + `shared`).

## Goals

1. Automatically open dependency update PRs for npm workspaces.
2. Prioritize security patches with fast PR turnaround.
3. Keep PR volume manageable with grouping rules.
4. Ensure every update is validated by existing repo checks.

## Non-Goals

1. Automatic major-version auto-merge.
2. Replacing existing lint/typecheck/test/build quality gates.
3. Runtime secret rotation or package signing policy.

## Current State

1. npm workspace monorepo with:
    - root `package.json`
    - `backend/package.json`
    - `frontend/package.json`
    - `shared/package.json`
2. Quality gates already defined:
    - lint
    - typecheck
    - frontend tests
    - workspace build
3. Renovate config now exists in-repo:
    - [renovate.json](/Users/fredkorts/Documents/Development/Personal%20Projects/scraper/.github/renovate.json)
4. GitHub-side enablement (App install, branch protection wiring) is still pending.

## Locked Decisions

1. Use Renovate GitHub App as the dependency automation engine.
2. Trigger model: repository-event driven (push/merge/webhook) with optional low-frequency fallback schedule.
3. Keep auto-merge limited to low-risk updates only after checks pass.
4. Major updates require manual review and merge.

## Trigger Model (Repository Events)

Renovate processing should be driven primarily by repository events:

1. Push to default branch (`main`).
2. PR merge into default branch.
3. Branch updates that affect manifests/lockfiles.
4. Manual "check now" trigger from Renovate dashboard/comment when needed.

Optional safety net:

1. Add a fallback schedule (daily) in case webhook delivery is delayed or missed.
2. Keep event-driven processing as the primary path; schedule is only a safety net.

## Scope

### Included package managers

1. npm (`package.json` / lockfile updates across workspaces)
2. GitHub Actions dependencies (`.github/workflows/*.yml`) once workflows exist

### Included dependency types

1. runtime dependencies
2. devDependencies
3. GitHub Actions versions (optional in phase 1, required in phase 2)

## Implementation Deliverables

1. `.github/renovate.json` with monorepo policy
2. branch protection/check requirements documented
3. README section describing dependency automation behavior
4. labels/milestones conventions for dependency PR triage (optional but recommended)
5. Renovate GitHub App installed with repository webhook permissions confirmed
6. documented app permission minimums and auto-merge activation gate

## Proposed Renovate Configuration Policy

## Baseline behavior

1. Enable Renovate onboarding PR.
2. Extend recommended preset.
3. Respect semantic commits if repo uses them.
4. Use timezone matching team location.
5. Prefer immediate processing from webhook events; do not depend only on cron schedules.

## Update strategy

1. Group patch/minor updates by workspace:
    - `frontend` group
    - `backend` group
    - `shared/root` group
2. Keep major updates separate (one PR per package).
3. Enable lockfile maintenance PR weekly.

## Security handling

1. Security PRs labeled `security` + `dependencies`.
2. Security PRs bypass normal batching/grouping if needed for speed.
3. Security PRs should be highest triage priority.

## Auto-merge policy

1. Allowed:
    - patch updates for explicitly allowlisted development/tooling packages only
    - digest updates for non-runtime lockfile refreshes
2. Conditions:
    - required checks green
    - no merge conflicts
    - branch up-to-date
    - branch protection required checks are active and enforced
3. Disallowed:
    - all major updates
    - all minor/patch updates for runtime/auth/db/queue/core libraries unless explicitly allowlisted
    - any update with failing or skipped required checks

## Explicit Package Rules

Default rule:

1. `automerge=false` for all packages unless allowlisted.

Allowlist examples (low-risk tooling only; exact list can be tuned):

1. eslint ecosystem
2. prettier
3. stylelint ecosystem
4. typescript-eslint packages
5. @types/\* packages

Denylist examples (always manual review):

1. `prisma`
2. `@prisma/client`
3. `express`
4. `bullmq`
5. `ioredis`
6. auth/jwt packages
7. zod runtime validation packages

## PR hygiene policy

1. Limit concurrent Renovate PRs (example: 5-8 max open).
2. Add labels:
    - `dependencies`
    - `security` (when applicable)
    - `frontend` / `backend` / `shared`
3. Include release notes/changelog links in PR body.

## CI/Branch Protection Requirements

Dependency PRs must run the same required checks as feature PRs:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test --workspace=frontend`
4. `npm run build --workspaces`

Required status checks should be enforced in branch protection so no dependency PR merges without validation.

Branch protection must reference concrete CI job names (not shell commands). Required job names should be:

1. `lint`
2. `typecheck`
3. `frontend-tests`
4. `build`

If CI workflow uses different job names, this section and branch protection rules must be updated together.

## App Permissions and Security Gates

Renovate GitHub App minimum required permissions:

1. Read/write pull requests
2. Read/write contents (for branch updates)
3. Read metadata
4. Read checks/statuses

Hard gate:

1. Auto-merge remains disabled until required branch protections are active on `main`.
2. Enabling auto-merge requires a verified dry-run period (Phase 1) with no unresolved CI bypass issues.

## Rollout Plan

### Phase 1 (safe start)

1. Add Renovate config with:
    - onboarding PR enabled
    - no auto-merge
    - grouping + PR limits
    - event-driven processing enabled via GitHub App install
2. Observe 1-2 weeks of PR quality/noise.
3. Tune grouping/ignore rules.
4. Verify branch protection required check names match CI job names exactly.

### Phase 2 (controlled automation)

1. Enable auto-merge for low-risk patch/dev-tool updates only.
2. Keep majors/manual updates unchanged.
3. Keep security PRs high-priority and visible.
4. Keep denylisted/core runtime packages on manual-review-only path.

## Testing / Validation Plan

1. Confirm onboarding PR appears after app installation.
2. Trigger repository event with a small default-branch merge and verify Renovate run starts.
3. Validate at least one generated PR updates workspace lockfile correctly.
4. Confirm CI checks run and block failing updates.
5. Validate labels/grouping/automerge behavior against policy.
6. Validate fallback schedule behavior by waiting for next window if no event fires.
7. Validate denylisted package updates never enter auto-merge path.

## Failure Modes and Mitigations

1. Too many PRs:
    - tighten grouping and PR concurrency limits.
2. Broken updates:
    - keep required checks strict, disable auto-merge for problematic package classes.
3. Lockfile churn:
    - weekly lockfile maintenance + workspace grouping.
4. Silent inactivity:
    - monitor Renovate dashboard/issues and keep daily fallback schedule active.

## Operational Runbook (Rollback / Containment)

If dependency automation misbehaves (PR flood, bad merges, noisy updates):

1. Disable Renovate auto-merge immediately.
2. Reduce concurrent PR limit to `1-2`.
3. Pause Renovate app temporarily if required.
4. Merge/close existing update PR backlog in priority order: security first, runtime second, tooling last.
5. Re-enable automation only after policy/config correction and one successful validation cycle.

## Acceptance Criteria

1. Renovate is installed and active on the repository.
2. `.github/renovate.json` exists and is accepted by Renovate.
3. Dependency PRs are created automatically from repository events.
4. Security updates are surfaced as prioritized PRs.
5. Required CI checks run on dependency PRs.
6. Auto-merge (if enabled) is limited to approved low-risk update classes.
7. README documents the dependency automation workflow.
8. Event-driven runs are observable in Renovate dashboard/logs after push/merge activity.

## Assumptions

1. Repository is hosted on GitHub and can install GitHub Apps.
2. Branch protection can require CI checks before merge.
3. Existing CI/check commands remain stable enough for dependency PR validation.
