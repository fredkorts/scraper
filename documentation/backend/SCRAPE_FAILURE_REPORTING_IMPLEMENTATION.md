# Scrape Failure Reporting Implementation Plan

## Status

Implemented.

## Purpose

Improve scrape-run failure visibility so operators and users can understand:

- why a scrape failed
- where it failed
- whether the failure is likely retryable
- whether the run data is safe to use in downstream features

This plan is intentionally scoped to failed runs first. It should also leave room for future partial-success and warning metadata without forcing another redesign.

## Current Problem

Today a failed scrape run only stores a raw `errorMessage` on `scrape_runs`.

That has three weaknesses:

1. It is too technical for normal dashboard users.
2. It loses useful context such as failure phase and page number.
3. It is not structured enough for filtering, analytics, or future recovery tooling.

Current behavior:

- scraper stores a raw string in `scrape_runs.error_message`
- run detail API returns that raw string
- frontend renders the raw string directly in the run-detail view

That is adequate for debugging during early development, but not for a usable monitoring surface.

## Goals

1. Persist structured failure metadata for scrape runs.
2. Show a readable explanation in the run-detail view.
3. Preserve technical details for debugging without exposing only raw low-level errors.
4. Keep the design compatible with future partial-success or warning states.
5. Avoid using failure-only metadata in product history, diff, or notification logic.

## Non-Goals

- implementing partial-success run persistence
- changing diff semantics
- changing snapshot persistence rules
- building a full admin observability dashboard

## Product Rules

1. Failed runs remain non-authoritative.
2. Failed runs must not contribute to:
    - diffs
    - product history
    - current canonical product state
    - notifications
3. The run-detail page must show both:
    - a human-readable explanation
    - an operator-oriented technical details section when the viewer is allowed to see it
4. If the scraper can identify the page URL and page number, both should be stored.
5. If the failure source is unknown, the record must still be valid and readable.
6. Structured failure metadata belongs only to scrape-execution failures, not downstream notification failures.

## Data Invariants

1. Failure metadata is authoritative only when `scrape_runs.status = FAILED`.
2. Non-failed runs must not retain stale failure metadata.
3. `failure_page_number`, when present, must be a positive integer.
4. `failure_page_url`, when present, must be a normalized URL under the configured scraper base host.
5. The API must expose one canonical failure object; legacy fields may exist temporarily for backward compatibility but must not become a second source of truth.

## Proposed Data Model

Extend `scrape_runs` with structured failure metadata.

Recommended fields:

- `failure_code`
- `failure_phase`
- `failure_page_url`
- `failure_page_number`
- `failure_is_retryable`
- `failure_technical_message`
- `failure_summary`

Keep the existing `error_message` for backward compatibility during migration only.

Long-term direction:

- `failure_summary` is the canonical user-facing summary in structured failure metadata
- `failure_technical_message` stores the sanitized low-level detail
- `error_message` is deprecated and should be removed from primary API shaping once frontend consumers migrate

### Recommended field semantics

- `failure_code`
    - machine-readable cause
    - examples:
        - `upstream_timeout`
        - `http_error`
        - `parser_zero_products`
        - `parser_warning_limit`
        - `safety_limit_reached`
        - `persist_failed`
        - `diff_failed`
        - `unknown_error`

- `failure_phase`
    - stage of failure
    - examples:
        - `fetch`
        - `parse`
        - `persist`
        - `diff`
        - `notification`

- `failure_page_url`
    - exact URL being processed when the error occurred

- `failure_page_number`
    - derived page number if known
    - nullable for failures that happen outside paginated fetch flow

- `failure_is_retryable`
    - `true` for timeouts and likely transient upstream/network issues
    - `false` for parser/safety/data integrity failures

- `failure_technical_message`
    - raw error detail for debugging

- `failure_summary`
    - short readable explanation suitable for normal authenticated users
    - examples:
        - `The scrape timed out while loading page 31.`
        - `The scraper found no valid products on the first page.`

## Prisma Changes

### Schema update

Add nullable fields to `ScrapeRun`:

- `failureCode String? @map("failure_code")`
- `failurePhase String? @map("failure_phase")`
- `failurePageUrl String? @map("failure_page_url")`
- `failurePageNumber Int? @map("failure_page_number")`
- `failureIsRetryable Boolean? @map("failure_is_retryable")`
- `failureTechnicalMessage String? @map("failure_technical_message")`
- `failureSummary String? @map("failure_summary")`

### Migration

Create a migration that:

- adds the new nullable columns
- preserves existing rows without backfill requirements
- adds a check constraint for `failure_page_number > 0` if the migration approach and Prisma workflow allow it safely

Optional later improvement:

- replace free-string fields with Prisma enums once the taxonomy is stable

For now, strings are the safer first step because the failure taxonomy will likely evolve during real scraper use.

## Backend Design

### 1. Introduce a typed scrape failure model

Create a shared internal backend type such as:

```ts
interface ScrapeFailureInfo {
    summary: string;
    technicalMessage?: string;
    code: string;
    phase: "fetch" | "parse" | "persist";
    pageUrl?: string;
    pageNumber?: number;
    isRetryable: boolean;
}
```

This should stay backend-internal first. Only API-safe fields should be exposed through shared contracts.

### 2. Normalize low-level errors into structured failure info

Create a mapper such as:

- `backend/src/scraper/map-scrape-error.ts`

Responsibilities:

- inspect Axios timeouts and HTTP errors
- inspect parser guardrail errors
- inspect persistence failures
- derive a safe summary for UI use
- preserve a technical message for debugging
- normalize page URL to the configured scraper host before persisting it

### 3. Capture page context during fetch loop

The scraper already tracks:

- `nextPageUrl`
- `pagesScraped`

When a failure occurs during page fetch or parse, pass:

- current page URL
- expected page number

into the failure mapper.

Recommended page-number rule:

- first page of category root URL => page `1`
- `/page/N/` => page `N`
- if extraction fails => `undefined`

### 4. Persist structured failure metadata on failed runs

In the `catch` block of the scraper:

- map the error into `ScrapeFailureInfo`
- write:
    - human summary into `failureSummary`
    - structured fields into the new columns
    - legacy `errorMessage` only if needed during compatibility window

When a run is finalized as non-failed:

- clear all structured failure fields
- avoid leaving stale failure metadata on completed runs

### 5. Extend run-detail and runs-list payloads

Update backend response shaping so scrape run payloads can include:

```ts
failure?: {
  summary: string;
  code?: string;
  phase?: string;
  pageUrl?: string;
  pageNumber?: number;
  isRetryable?: boolean;
}
```

Rules:

- include `failure` only when the run failed
- `failure.summary` is the canonical API-facing summary
- keep `errorMessage` temporarily for compatibility if needed, but derive it from the canonical failure data during transition
- frontend should migrate to use `failure.summary`
- expose `technicalMessage` only on admin-scoped run detail payloads, not on general run payloads

### 6. Dashboard summary behavior

For dashboard home and runs list:

- show only the short summary
- do not show technical detail there

For run detail:

- show the short summary prominently
- show technical details only for admin users in a secondary clearly separated section

## Shared Contract Changes

Update `shared/src/index.ts` response types for:

- dashboard recent failures
- runs list items
- run detail

Recommended shape:

```ts
export interface ScrapeRunFailure {
    summary: string;
    code?: string;
    phase?: string;
    pageUrl?: string;
    pageNumber?: number;
    isRetryable?: boolean;
}
```

Use this shared shape in all scrape-run payloads where failures are exposed.

For admin-only run detail responses, add a backend-local extension shape instead of widening the shared public contract with privileged detail by default.

## Frontend UX Plan

### Run detail view

Replace the current raw error alert with a dedicated failure panel.

Sections:

1. Readable summary
    - example: `The scrape timed out while loading page 31.`

2. Context list
    - phase: `Fetch`
    - page: `31`
    - retryable: `Yes`
    - URL: linked if safe to show

3. Technical details
    - raw technical message in a lower-priority block for admin viewers only

### Runs list view

For failed rows:

- show a concise summary line
- optionally show page number if present
- avoid long raw Axios strings in the table

### Dashboard home

Recent failures should show:

- category name
- started time
- short readable failure summary

No raw stack-like output on dashboard home.

## Readability Rules

Human summaries must be:

- plain language
- one sentence if possible
- specific about cause and page when known
- free of low-level library wording unless unavoidable

Examples:

- `The scrape timed out while loading page 31.`
- `The scraper found no valid products on the first page, so the run was stopped.`
- `The scrape stopped because the parser reported too many warnings on one page.`
- `The scrape hit the configured page safety limit before finishing the category.`

Avoid exposing raw text such as:

- `AxiosError: timeout of 45000ms exceeded`

as the primary user-facing message.

## Accessibility Rules

1. Failure summary must be rendered in a semantic alert or clearly labeled status region.
2. Technical details must remain readable to screen readers.
3. Failure type must not rely on color alone.
4. URL and page metadata must use semantic labels.
5. If details are collapsible later, the toggle must be keyboard accessible.

## Security and Privacy Rules

1. Do not expose secrets, cookies, headers, or stack traces in API responses.
2. Do not store raw request headers in failure metadata.
3. `technicalMessage` should be sanitized to error text, not whole serialized error objects.
4. Only expose page URLs that are safe public category URLs.
5. `technicalMessage` should be admin-only or backend-only.
6. Failure codes and phases should remain high-level enough that they do not reveal unnecessary infrastructure internals to normal users.

## Implementation Steps

### Phase A: Schema and backend model

1. Add new `scrape_runs` failure columns in Prisma schema.
2. Generate and apply migration.
3. Update shared run payload interfaces.
4. Define admin-only run detail extension shape for technical failure detail.

### Phase B: Failure classification

1. Add scraper failure mapper utility.
2. Detect and classify:
    - Axios timeout
    - HTTP status failures
    - parser zero-products failure
    - parser warning limit failure
    - safety-limit failure
    - persistence failure
    - unknown fallback
3. Capture page URL and page number where available.
4. Normalize and validate failure URL/page metadata before persistence.

### Phase C: API shaping

1. Extend runs service mappers to emit `failure` objects.
2. Keep compatibility with existing payload consumers until frontend is updated.
3. Gate technical failure detail behind admin authorization.

### Phase D: Frontend presentation

1. Add failure formatter helpers in the runs feature.
2. Replace raw error rendering in run detail.
3. Improve recent-failure display on dashboard home.
4. Improve failed-row rendering in runs list.

### Phase E: Tests

1. Backend unit tests for error mapping.
2. Backend route tests for failed run payload shaping.
3. Frontend tests for readable failure rendering.

## Test Plan

### Backend unit tests

Write tests for the error mapper covering:

1. Axios timeout on page 31
2. HTTP 403 on a category page
3. parser zero-products on first page
4. parser warning limit exceeded
5. safety limit reached
6. unknown error fallback

Assertions:

- correct `summary`
- correct `code`
- correct `phase`
- correct `pageNumber`
- correct `isRetryable`
- technical message is present, sanitized, and not included in non-admin API shapes

### Backend route tests

Extend run route tests so a failed run can return:

- summary
- page number
- phase
- retryability flag

Verify:

- inaccessible runs still return `404`
- dashboard recent failures return short summaries only if designed that way
- run detail returns the full failure object
- non-admin run detail does not expose technical failure detail
- admin run detail does expose sanitized technical failure detail when present

### Frontend tests

Add view tests to verify:

1. run detail renders a readable failure summary
2. page number is shown when present
3. retryability text is shown correctly
4. technical details render in secondary position
5. runs list uses concise failure text for failed runs
6. dashboard recent failures show readable summaries
7. non-admin run detail does not show admin-only technical metadata

## Open Decisions

1. Should failure taxonomy use free strings first or Prisma enums immediately?
    - Recommendation: free strings first

2. Should failed runs expose page URLs directly in the UI?
    - Recommendation: yes for public category URLs

## Recommended First Slice

The smallest useful version is:

1. add structured failure columns
2. classify timeout/parser/safety failures
3. expose `failure` in run detail
4. replace raw error rendering in the run-detail page
5. keep technical failure detail admin-only from the first implementation slice

That gives immediate operational value without forcing a full dashboard redesign.

## Acceptance Criteria

This work is complete when:

1. a failed scrape run stores structured failure metadata
2. run detail explains the failure in readable language
3. run detail shows page number and URL when known
4. raw low-level error text is no longer the primary user-facing message
5. failed runs remain excluded from diffs, history, and notifications
6. backend and frontend tests cover the new failure-reporting behavior
7. non-admin users cannot access technical failure detail
