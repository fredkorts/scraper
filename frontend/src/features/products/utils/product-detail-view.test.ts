import { describe, expect, it } from "vitest";
import { getProductDiscountState, getProductFreshnessState, getRelativeUpdatedLabel } from "./product-detail-view";

describe("product-detail-view utils", () => {
    it("computes relative freshness labels", () => {
        const now = new Date("2026-03-06T12:00:00.000Z");

        expect(getRelativeUpdatedLabel("2026-03-06T11:59:30.000Z", now)).toBe("Updated just now");
        expect(getRelativeUpdatedLabel("2026-03-06T11:00:00.000Z", now)).toBe("Updated 1 hour ago");
        expect(getRelativeUpdatedLabel("2026-03-04T12:00:00.000Z", now)).toBe("Updated 2 days ago");
    });

    it("flags stale data when threshold is exceeded", () => {
        const now = new Date("2026-03-06T12:00:00.000Z");
        const freshness = getProductFreshnessState("2026-03-04T11:00:00.000Z", now, 48);
        expect(freshness.isStale).toBe(true);
    });

    it("computes discount state from current and original prices", () => {
        expect(getProductDiscountState(19.99)).toEqual({
            hasOriginalPrice: false,
            hasDiscount: false,
        });

        expect(getProductDiscountState(24.99, 24.99)).toEqual({
            hasOriginalPrice: true,
            hasDiscount: false,
        });

        const discounted = getProductDiscountState(19.99, 24.99);
        expect(discounted.hasOriginalPrice).toBe(true);
        expect(discounted.hasDiscount).toBe(true);
        expect(discounted.discountAmount).toBeCloseTo(5);
        expect(discounted.discountPercent).toBe(20);
    });
});
