import { describe, expect, it } from "vitest";
import { createNotificationRequestTracker } from "./request-tracker";

describe("request-tracker", () => {
    it("accepts responses when no tracked request exists yet", () => {
        const tracker = createNotificationRequestTracker();
        expect(tracker.isLatest("settings:channel:update", "req-1")).toBe(true);
    });

    it("only accepts the latest request for a given action key", () => {
        const tracker = createNotificationRequestTracker();

        tracker.markLatest("settings:channel:update", "req-1");
        tracker.markLatest("settings:channel:update", "req-2");

        expect(tracker.isLatest("settings:channel:update", "req-1")).toBe(false);
        expect(tracker.isLatest("settings:channel:update", "req-2")).toBe(true);
    });

    it("tracks each action key independently", () => {
        const tracker = createNotificationRequestTracker();

        tracker.markLatest("settings:channel:update", "req-2");
        tracker.markLatest("settings:tracking:create", "req-a");

        expect(tracker.isLatest("settings:channel:update", "req-2")).toBe(true);
        expect(tracker.isLatest("settings:tracking:create", "req-a")).toBe(true);
        expect(tracker.isLatest("settings:tracking:create", "req-b")).toBe(false);
    });
});
