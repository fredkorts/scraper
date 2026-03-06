import { PRODUCT_STALE_THRESHOLD_HOURS } from "../constants/product-detail.constants";

export interface ProductFreshnessState {
    isStale: boolean;
    relativeLabel: string;
}

export interface ProductDiscountState {
    hasOriginalPrice: boolean;
    hasDiscount: boolean;
    discountAmount?: number;
    discountPercent?: number;
}

const toSafeDate = (value: string): Date | null => {
    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getRelativeUpdatedLabel = (lastSeenAt: string, now = new Date()): string => {
    const lastSeenDate = toSafeDate(lastSeenAt);

    if (!lastSeenDate) {
        return "Updated time unavailable";
    }

    const elapsedMs = Math.max(0, now.getTime() - lastSeenDate.getTime());
    const elapsedMinutes = Math.floor(elapsedMs / 60_000);

    if (elapsedMinutes < 1) {
        return "Updated just now";
    }

    if (elapsedMinutes < 60) {
        return `Updated ${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours < 24) {
        return `Updated ${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);
    return `Updated ${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
};

export const getProductFreshnessState = (
    lastSeenAt: string,
    now = new Date(),
    staleThresholdHours = PRODUCT_STALE_THRESHOLD_HOURS,
): ProductFreshnessState => {
    const lastSeenDate = toSafeDate(lastSeenAt);

    if (!lastSeenDate) {
        return {
            isStale: false,
            relativeLabel: "Updated time unavailable",
        };
    }

    const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
    const elapsedMs = now.getTime() - lastSeenDate.getTime();

    return {
        isStale: elapsedMs > staleThresholdMs,
        relativeLabel: getRelativeUpdatedLabel(lastSeenAt, now),
    };
};

export const getProductDiscountState = (currentPrice: number, originalPrice?: number): ProductDiscountState => {
    if (originalPrice === undefined) {
        return {
            hasOriginalPrice: false,
            hasDiscount: false,
        };
    }

    if (originalPrice <= currentPrice) {
        return {
            hasOriginalPrice: true,
            hasDiscount: false,
        };
    }

    const discountAmount = originalPrice - currentPrice;
    const discountPercent = Math.round((discountAmount / originalPrice) * 100);

    return {
        hasOriginalPrice: true,
        hasDiscount: true,
        discountAmount,
        discountPercent,
    };
};
