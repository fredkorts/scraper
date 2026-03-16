# Telegram Message UX Template Implementation

## Status

Planned (March 16, 2026).

## Summary

Refactor Telegram immediate alert messages to be client-facing, concise, and scannable while prioritizing watched products when present. Implement with strict test-first workflow and gated rollout.

## Goals

1. Improve readability and decision speed for Telegram alerts.
2. Prioritize watched/tracked products in highlighted items.
3. Keep message length compact and mobile-friendly.
4. Preserve delivery reliability and safety.

## Scope

1. Include:

- `backend/src/notifications/templates.ts` (`renderImmediateTelegram`)
- `backend/src/notifications/transport.ts` (`sendTelegramMessage` payload formatting)
- Notification tests for template output and immediate sending.

2. Exclude:

- Email template redesign.
- Digest email format changes.
- Frontend notification UI changes.

## Data Contract Decisions

1. Timezone source for Telegram messages:

- Primary: `user.timezone` profile field (IANA timezone id).
- Fallback: `UTC` when timezone is missing/invalid.
- Non-goal for this phase: deriving timezone from request IP.

2. Terminology source-of-truth:

- Add shared notification label constants in `shared` package.
- Backend templates and frontend labels must import from shared constants.

3. Compatibility note:

- Telegram template output remains backend-side message content only.
- No frontend API payload shape changes are required for this phase.

## Frontend/Schema Compatibility

1. If `user.timezone` is introduced in a later phase:

- Add DB migration and Prisma model field.
- Extend backend auth/session response schemas and serializers.
- Extend shared `AuthUser` type.
- Extend frontend API schemas (`authUserSchema`) and session types.

2. For current phase:

- Keep timezone fallback to UTC and avoid breaking auth/session contracts.

## UX Requirements

1. Message structure:

- Header: `PricePulse: <count> changes in <category>`
- Run line: `Run: <friendly timestamp>`
- Highlights: max 3 lines
- Overflow line: `+N more changes` if truncated
- CTA: `View all changes: <url>`

2. Per-item format:

- One line per item.
- Use compact markers: `⬇`, `⬆`, `🔴`, `🟢`, `🆕`.
- Use concise value format for price deltas.

3. Watched visibility:

- If item is watched, prepend explicit marker `⭐` so prioritization is understandable.

4. Message length budgets:

- Max 3 highlight lines.
- Max item line length target: 90 characters (truncate product names with ellipsis).
- Primary message target: <= 700 characters for reliable chat preview readability.

5. Timestamp policy:

- Render in user timezone when available.
- Fallback to UTC with explicit suffix (`UTC`) when user timezone is unknown.

6. Telegram client consistency:

- Validate rendering on Telegram iOS, Android, and Desktop before production enablement.

7. Language consistency:

- Use `Sold out` (not mixed variants).
- Keep labels aligned with frontend terminology.

8. Truncation behavior:

- Truncate product names before composing full item line.
- Perform truncation on grapheme clusters (not raw JS string length).
- Apply HTML escaping after truncation and verify final line budget with escaping applied.
- If escaped line exceeds budget, apply a final safe trim with ellipsis.

## Prioritization Rules (Mandatory)

Sort items before truncation:

1. Watched products first (`isWatchedAtSend === true`).
2. Then non-watched by severity:

- `sold_out`
- `back_in_stock`
- `price_decrease`
- `price_increase`
- `new_product`

3. Preserve stable order for ties.

## Technical Plan

1. Template refactor:

- Replace current free-form lines with structured message builder.
- Add helpers for:
    - watched-first ranking
    - severity ranking
    - compact line rendering by change type

2. Transport formatting:

- Add `parse_mode: "HTML"` to Telegram send payload.
- Escape all dynamic text before rendering.
- Keep fallback behavior to plain text if necessary.

3. Feature flag rollout:

- Add `NOTIFICATIONS_TELEGRAM_TEMPLATE_V2` gate.
- Default disabled until internal validation passes.

## Test-Driven Development Plan (Do First)

Write tests before implementation changes.

1. Template unit tests (`backend/src/notifications/templates.test.ts` or existing notification test file):

- renders required sections in order (header, run, items, overflow, CTA)
- enforces max 3 visible items
- displays overflow count when list exceeds cap
- prioritizes watched items before non-watched
- includes watched marker (`⭐`) on watched entries
- respects severity ordering inside watched/non-watched groups
- truncates long product names according to line budget
- keeps message length under defined target
- safely escapes product names containing `<`, `&`, quotes
- handles emoji/combined unicode without broken graphemes after truncation
- uses consistent wording (`Sold out`)
- timestamp rendering follows timezone policy and fallback behavior
- uses shared terminology constants (no duplicated hardcoded labels)
- preserves line budget after HTML escaping

2. Immediate send integration tests (`backend/src/notifications/send-immediate.test.ts`):

- sends formatted Telegram message for Telegram default channel
- marks delivery `SENT` on successful Telegram send
- marks delivery `FAILED` with useful error on Telegram API failure
- verifies payload includes parse mode when enabled

3. Feature flag tests:

- when flag disabled, current template remains unchanged
- when flag enabled, v2 template is used

## Acceptance Criteria

1. Telegram alerts are concise and scannable in mobile chat preview.
2. Watched products are prioritized when present.
3. Watched products are visibly labeled in the rendered message.
4. Message content follows required structure and wording.
5. Message line and length budgets are enforced.
6. Timestamp rendering follows defined timezone/fallback policy.
7. Telegram rendering is validated on iOS, Android, and Desktop clients.
8. No regression in delivery status handling.
9. All backend lint, typecheck, and tests pass.

## Verification Commands

1. `npm run lint --workspace=backend`
2. `npm run typecheck --workspace=backend`
3. `npm run test --workspace=backend -- src/notifications/send-immediate.test.ts`
4. `npm run test --workspace=backend -- <template test file>`

## Implementation Checklist

### Phase 0: Prep

- [ ] Confirm target files and existing test locations.
- [ ] Add/confirm feature flag name and config parsing.
- [ ] Define final severity rank mapping in code comments.
- [ ] Define timezone contract (`user.timezone` -> UTC fallback) and document it in code comments.
- [ ] Define shared terminology constants contract in `shared`.
- [ ] Confirm this phase does not alter frontend API response shapes.

### Phase 1: Tests First

- [ ] Add failing tests for message structure and section order.
- [ ] Add failing tests for watched-first prioritization.
- [ ] Add failing tests for watched marker visibility (`⭐`).
- [ ] Add failing tests for severity ordering.
- [ ] Add failing tests for truncation and overflow behavior.
- [ ] Add failing tests for line length and total message length budgets.
- [ ] Add failing tests for escaping and terminology.
- [ ] Add failing tests for escaped-length budget enforcement.
- [ ] Add failing tests for grapheme-safe truncation (emoji, combined unicode).
- [ ] Add failing tests for timezone rendering and UTC fallback.
- [ ] Add failing tests for feature-flag on/off behavior.
- [ ] Add failing integration assertions in `send-immediate.test.ts`.

### Phase 2: Implementation

- [ ] Refactor `renderImmediateTelegram` with helper functions.
- [ ] Add parse mode support in Telegram transport payload.
- [ ] Wire feature flag gating for v2 template.
- [ ] Keep old template path intact behind flag-off behavior.
- [ ] Move Telegram wording labels to shared constants and consume them in template/frontend.
- [ ] Implement grapheme-safe product-name truncation utility.
- [ ] Implement post-escape line budget guard.

### Phase 3: Validation

- [ ] Run backend lint.
- [ ] Run backend typecheck.
- [ ] Run targeted notification test suites.
- [ ] Run full backend tests if targeted tests pass.

### Phase 4: Rollout

- [ ] Enable flag in non-production/internal environment first.
- [ ] Validate with real watched/non-watched mixed scenarios.
- [ ] Validate final message rendering in Telegram iOS, Android, and Desktop clients.
- [ ] Monitor send success/failure logs for 24-48h.
- [ ] Validate backward compatibility with currently deployed frontend build (no schema drift assumptions).
- [ ] Enable in production after validation.
- [ ] Remove legacy path in a later cleanup release.

## Risks and Mitigations

1. Risk: formatting breaks because of unescaped dynamic text.
   Mitigation: central escape helper + dedicated tests.
2. Risk: overly long message hurts readability.
   Mitigation: strict 3-item cap + compact line format.
3. Risk: ranking logic surprises users.
   Mitigation: watched-first + deterministic severity order, documented in tests.
4. Risk: rollout regressions.
   Mitigation: feature flag + staged enablement.
