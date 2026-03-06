import { afterEach, describe, expect, it, vi } from "vitest";
import {
    NOTIFICATION_DESKTOP_PLACEMENT,
    NOTIFICATION_DURATION_BY_VARIANT,
    NOTIFICATION_MAX_COUNT,
    NOTIFICATION_MOBILE_PLACEMENT,
    getNotificationPlacement,
} from "./notification-config";

describe("notification-config", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    const createMatchMediaResult = (matches: boolean): MediaQueryList =>
        ({
            matches,
            media: "",
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }) as MediaQueryList;

    it("defines default max count and durations", () => {
        expect(NOTIFICATION_MAX_COUNT).toBe(3);
        expect(NOTIFICATION_DURATION_BY_VARIANT.success).toBe(4);
        expect(NOTIFICATION_DURATION_BY_VARIANT.error).toBe(8);
    });

    it("returns desktop placement by default", () => {
        vi.spyOn(window, "matchMedia").mockReturnValue(createMatchMediaResult(false));

        expect(getNotificationPlacement()).toBe(NOTIFICATION_DESKTOP_PLACEMENT);
    });

    it("returns mobile placement for narrow viewports", () => {
        vi.spyOn(window, "matchMedia").mockReturnValue(createMatchMediaResult(true));

        expect(getNotificationPlacement()).toBe(NOTIFICATION_MOBILE_PLACEMENT);
    });
});
