import { describe, expect, it, beforeEach, vi } from "vitest";
import {
    getAdaptivePenaltyMs,
    getInterPageDelayMs,
    getRetryDelayMs,
    parseRetryAfterMs,
    recordSuccessfulFetch,
    recordUpstreamPressure,
    resetAdaptiveDelayState,
} from "./adaptive-delay";

describe("adaptive delay", () => {
    beforeEach(() => {
        resetAdaptiveDelayState();
    });

    it("parses Retry-After seconds", () => {
        expect(parseRetryAfterMs("3")).toBe(3000);
    });

    it("parses Retry-After HTTP dates", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-04T10:00:00.000Z"));
        expect(parseRetryAfterMs("Wed, 04 Mar 2026 10:00:05 GMT")).toBe(5000);
        vi.useRealTimers();
    });

    it("increases and decays adaptive penalty", () => {
        recordUpstreamPressure(800);
        expect(getAdaptivePenaltyMs()).toBe(800);

        recordSuccessfulFetch();
        expect(getAdaptivePenaltyMs()).toBe(400);
    });

    it("produces bounded delays", () => {
        recordUpstreamPressure(2_000);

        const interPage = getInterPageDelayMs();
        const retryDelay = getRetryDelayMs(2);

        expect(interPage).toBeGreaterThanOrEqual(1000);
        expect(retryDelay).toBeGreaterThanOrEqual(250);
    });
});
