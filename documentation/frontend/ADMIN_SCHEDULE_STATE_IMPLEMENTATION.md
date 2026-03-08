# Admin Schedule State Implementation Plan

## Status

Implemented.

## Summary

Improve the Settings Admin experience by separating:

1. **Category configuration state** (interval, next run, subscribers, eligibility),
2. **Run history** (already covered elsewhere),
3. **Immediate operations** (manual trigger, interval update).

Add an admin-only **Category Schedule State** table and align admin controls so they are operationally correct and easy to understand.

## Problem Statement

Current admin controls allow selecting a category and updating interval/triggering runs, but they do not show enough schedule context in one place.

This creates ambiguity:

1. “Is this category actually schedulable right now?”
2. “What is the effective interval and next run time?”
3. “Why is this category not being enqueued?”

Also, using run history as scheduling truth is misleading because runs are historical records, not scheduler configuration state.

## Product Decisions (Locked)

1. Add a new **Category Schedule State** table in the admin tab.
2. Keep interval edit and manual trigger controls in admin tab.
3. Do **not** restrict interval editing to only currently due/enqueued categories.
4. For manual trigger, show only active categories and clear disabled-state reasons where needed.
5. Reuse existing shared UI primitives:
    - `DataTable`
    - `AppButton`
    - existing notification system (`useAppNotification`)
    - existing selects (`CategoryTreeSelect`, `AppSelect`) where applicable.

## Scope

### In Scope

1. New backend admin endpoint returning schedule state rows.
2. New frontend query + table in settings admin tab.
3. Clear eligibility and status presentation.
4. Refresh/invalidation behavior after admin actions.
5. Tests for backend and frontend behavior.

### Out of Scope

1. Replacing runs pages.
2. Multi-worker orchestration redesign.
3. Queue architecture changes.
4. New RBAC model (admin-only remains).

## UX Design

### Admin Tab Structure

Order sections:

1. **Category Schedule State** (table)
2. **Interval Update** (category + interval + save)
3. **Manual Scrape Trigger** (category + trigger action)

### Human-readable status copy

Map backend enums to UI labels:

1. `eligible` -> `Eligible`
2. `inactive_category` -> `Inactive category`
3. `no_active_subscribers` -> `No active subscribers`
4. `not_due_yet` -> `Not due yet`

Do not render raw enum values in the table.

### Category Schedule State Columns

1. Category (path label)
2. Interval (hours)
3. Next run at
4. Active subscribers
5. Eligibility status
6. Queue status (`idle`, `queued`, `active`)
7. Last run (timestamp + status)
8. Actions:
    - `Edit interval` (prefills controls)
    - `Scrape now` (trigger)

### Table state behavior

Define explicit table states:

1. Loading: skeleton/placeholder rows.
2. Empty: `No scheduler categories available.`
3. Error: inline error state with retry action.
4. Last refreshed metadata: `Updated <time>` near table heading.

### Timestamp display

1. Display local timezone absolute time for `nextRunAt` and `lastRunAt`.
2. Optionally add relative helper text (`in 2h`, `5m ago`).
3. Sorting must use raw timestamps, not formatted strings.

### Action safety and clarity

1. `Scrape now` must show disabled reason text when unavailable:
    - inactive category
    - already queued/active
2. If trigger returns duplicate/skip, show info notification:
    - `A scrape job is already queued for this category.`
3. `Edit interval` row action should prefill controls and move focus to interval selector.

### Eligibility Status Rules

Use explicit statuses:

1. `eligible`
2. `inactive_category`
3. `no_active_subscribers`
4. `not_due_yet`

### Why This UX

1. Distinguishes config from runtime state.
2. Keeps operational context visible before actions.
3. Reduces “why didn’t this run?” support loops.

## User Stories

1. As an admin, I want plain-language eligibility labels so I understand scheduler state quickly.
2. As an admin, I want to sort by `Next run at` so I can inspect upcoming load.
3. As an admin, I want to filter to non-eligible categories so I can resolve blockers fast.
4. As an admin, I want row actions to prefill controls so interval changes take one flow.
5. As an admin, I want clear feedback when a scrape is already queued so I avoid duplicate actions.
6. As an admin, I want local-time timestamps so I can reason about run timing correctly.
7. As an admin, I want visibility into categories with no run history so I can detect onboarding gaps.
8. As an admin, I want loading/error states to be explicit so I trust the current data.

## Edge Cases

1. Category has no `nextRunAt`.
2. Category has no run history (`lastRunAt` and `lastRunStatus` absent).
3. Trigger called while a job already exists for that category.
4. Interval update succeeds but queue status remains unchanged until next scheduler/worker cycle.
5. Category becomes inactive while admin page is open.
6. Endpoint returns partial optional fields.
7. Long category path overflows table cell.
8. Large dataset requires pagination and stable sorting/filtering.
9. Non-admin deep-links to `?tab=admin`.
10. Client timezone differs from server timezone.

## Backend Plan

## New endpoint

Add admin-only endpoint:

- `GET /api/admin/scheduler/state`

Authorization:

- `requireAuth` + `requireAdmin`

### Response Contract (shared)

```ts
type SchedulerEligibilityStatus = "eligible" | "inactive_category" | "no_active_subscribers" | "not_due_yet";

type SchedulerQueueStatus = "idle" | "queued" | "active";

interface AdminSchedulerStateItem {
    categoryId: string;
    categorySlug: string;
    categoryNameEt: string;
    categoryPathNameEt: string;
    isActive: boolean;
    scrapeIntervalHours: 6 | 12 | 24 | 48;
    nextRunAt?: string;
    activeSubscriberCount: number;
    eligibilityStatus: SchedulerEligibilityStatus;
    queueStatus: SchedulerQueueStatus;
    lastRunAt?: string;
    lastRunStatus?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
}

interface AdminSchedulerStateResponse {
    items: AdminSchedulerStateItem[];
    generatedAt: string;
}
```

### Service composition

1. Fetch categories with needed fields (active and inactive).
2. Join/aggregate active subscription counts.
3. Determine eligibility from:
    - `isActive`
    - subscriber count
    - `nextRunAt <= now`
4. Fetch latest run per category (single query strategy; avoid per-row query).
5. Resolve queue status from Bull by deterministic job id (`scrape:category:<categoryId>`).

### Performance notes

1. Admin-only endpoint can tolerate modest overhead.
2. Avoid N+1 for run/subscriber data.
3. Queue status lookup should be bounded; if needed, cap to visible/paginated rows.

## Frontend Plan

### Data layer

Add:

1. `useAdminSchedulerStateQuery` in `features/settings/queries.ts` (or dedicated admin query file).
2. runtime schema in `features/settings/schemas.ts`.
3. shared types update in `shared/src/index.ts`.
4. status/label constants in `features/settings/constants/scheduler-state.constants.ts`.
5. timestamp/status formatters in `features/settings/formatters/scheduler-state.formatters.ts`.

### Admin UI updates

In `SettingsAdminTab`:

1. Render `DataTable` for schedule state rows.
2. Reuse `AppButton` for row actions:
    - `intent="secondary"` for edit/prefill
    - `intent="warning"` or `intent="primary"` for scrape action (choose one and keep consistent)
3. Keep existing interval + trigger forms; prefill selected category from table row action.
4. Define table columns in a dedicated hook (`useAdminSchedulerColumns`) rather than inline JSX.
5. Add table filter/search controls using existing shared input/select patterns.
6. Keep render components presentational; place orchestration/formatting in hooks/helpers.

### React code-quality guardrails

1. Keep feature-local type definitions under `features/settings/types/` (no inline interfaces in component files).
2. Keep enums/constants under `features/settings/constants/`.
3. Keep formatter utilities pure and side-effect free under `features/settings/formatters/`.
4. Keep query key construction in a shared query-key helper; do not inline string keys in hooks/components.
5. Memoize table columns and expensive derived row transforms in hooks (not in render body).
6. Reuse existing hooks for notifications and mutation orchestration; avoid duplicated success/error handlers.
7. Keep `SettingsAdminTab` thin; if file size exceeds ~200 lines or has more than 3 conditional render branches, split into focused subcomponents.

### Notifications

Reuse existing notification hook:

1. Success on interval save and manual trigger.
2. Error on failed operations.
3. Optional info notification on data refresh failures.

### Invalidation strategy

After interval save or manual trigger:

1. Invalidate scheduler-state query.
2. Invalidate categories query (if interval shown elsewhere).
3. Keep existing runs invalidation for trigger action.
4. Centralize query keys/invalidation targets in settings query-key helpers to avoid duplication.

## Reuse Matrix

1. Table: `DataTable` (no custom table implementation).
2. Buttons: `AppButton` only (no raw `button` for actions).
3. Selects: existing `CategoryTreeSelect` / `AppSelect`.
4. Feedback: existing `useAppNotification`.
5. Search state: existing settings tab search model.
6. Pagination/sorting: existing shared table/pagination utilities.

## Testing Plan

### Backend

1. `GET /api/admin/scheduler/state` returns `403` for non-admin.
2. Response includes expected computed eligibility statuses.
3. Response includes latest run status/time per category.
4. Response includes queue status mapping.

### Frontend

1. Admin tab renders schedule state table rows.
2. Non-admin does not see admin tab.
3. `Edit interval` row action pre-fills form selection.
4. Interval save triggers success notification and table refresh.
5. Manual trigger triggers success/error notifications and table refresh.
6. Table loading/empty/error states render as specified.
7. Status values display readable labels, not raw enums.
8. Timestamps render in local timezone and sort correctly.
9. Shared helpers (status mapping/formatters/query key invalidation) are reused rather than duplicated.

## Rollout Steps

1. Add shared contracts + schemas.
2. Implement backend endpoint + tests.
3. Add frontend query + table rendering.
4. Wire row actions to existing admin mutations.
5. Add/adjust tests.
6. Verify with:
    - `npm run lint`
    - `npm run test --workspace=backend`
    - `npm run test --workspace=frontend`
    - `npm run build --workspace=frontend`

## Risks and Mitigations

1. **Risk:** Queue status lookup becomes slow with many categories.
    - **Mitigation:** paginate table and resolve queue status only for current page.
2. **Risk:** Eligibility logic drifts from scheduler logic.
    - **Mitigation:** centralize shared helper used by endpoint and scheduler where feasible.
3. **Risk:** Admin confusion between trigger and schedule updates.
    - **Mitigation:** explicit section copy and status labels.

## Acceptance Criteria

1. Admin can view a schedule-state table with interval, next run, subscribers, eligibility, queue, and latest run.
2. Admin can update interval and trigger manual scrape from the same surface.
3. UI reuses existing shared components (`DataTable`, `AppButton`, notifications).
4. Non-admin users cannot access endpoint or view controls.
5. Tests cover core new behaviors and role gating.
