# Notification Feedback Matrix

## Coverage

| View                     | User action       | Pending feedback                          | Success feedback                               | Failure feedback                          | Recovery action                  | Notification key                               |
| ------------------------ | ----------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------------------- | -------------------------------- | ---------------------------------------------- |
| Settings / Account       | Save profile name | Save button disabled + loading label      | `Profile updated`                              | `Profile update failed` + user-safe error | Retry save after adjusting input | `settings:account:update`                      |
| Settings / Tracking      | Track category    | Track button disabled + loading label     | `Category tracked`                             | `Could not track category`                | Retry or free plan slots         | `settings:tracking:create`                     |
| Settings / Tracking      | Stop tracking     | Stop button disabled while deleting       | `Tracking removed`                             | `Could not remove tracking`               | Retry remove                     | `settings:tracking:delete`                     |
| Settings / Notifications | Add channel       | Add button disabled while creating        | `Channel added`                                | `Could not add channel`                   | Retry with valid email           | `settings:channels:create`                     |
| Settings / Notifications | Toggle default    | Toggle pending state                      | `Channel updated`                              | `Could not update channel`                | Retry toggle                     | `settings:channels:update-default:{channelId}` |
| Settings / Notifications | Toggle active     | Toggle pending state                      | `Channel updated`                              | `Could not update channel`                | Retry toggle                     | `settings:channels:update-active:{channelId}`  |
| Settings / Notifications | Delete channel    | Delete button disabled while deleting     | `Channel removed`                              | `Could not remove channel`                | Retry delete                     | `settings:channels:delete:{channelId}`         |
| Settings / Admin         | Save interval     | Save button disabled while saving         | `Scrape interval saved`                        | `Could not save scrape interval`          | Retry save                       | `settings:admin:interval`                      |
| Settings / Admin         | Trigger scrape    | Trigger button disabled while pending     | `Scrape accepted` (queued/direct mode details) | `Could not trigger scrape`                | Retry trigger                    | `settings:admin:trigger-run`                   |
| Auth / Sign in           | Submit login form | Sign in button disabled + loading label   | Navigate to dashboard                          | `Sign in failed` + user-safe error        | Retry with corrected credentials | `auth:login:failed`                            |
| App shell                | Log out           | Logout button disabled + `Signing out...` | Redirect to login route                        | `Sign out failed`                         | Retry logout                     | `session:logout`                               |

## Dedupe and stale-response policy

1. Reuse stable action keys for single-operation flows (`settings:account:update`).
2. Use parameterized keys for channel-level updates (`{channelId}`).
3. For channel mutations, include `requestId` and only surface final notifications for the latest request per action key.
4. Validation errors stay inline on forms; mutation result notifications remain action-level only.
