export {
    formatDateTime,
    formatDuration,
    formatFailurePhaseLabel,
    formatPrice,
    formatRetryableLabel,
    formatStatusLabel,
} from "../../shared/formatters/display";
import { formatDateTime, formatPrice, formatStatusLabel } from "../../shared/formatters/display";
import { STOCK_STATUS_LABELS } from "../../shared/constants/stock.constants";
import {
    PREORDER_BADGE_LABEL,
    PREORDER_ETA_LABEL,
    PREORDER_STATE_NO_LABEL,
} from "../../shared/constants/preorder.constants";
import type { PriceTagProps } from "../../components/price-tag/PriceTag";
import type { ChangeIconVariant } from "../../shared/components/change-icon/ChangeIcon";

export type RunChangeTypeValue = ChangeIconVariant;

interface ChangeDetailsInput {
    changeType?: RunChangeTypeValue;
    oldPrice?: number;
    newPrice?: number;
    oldStockStatus?: boolean;
    newStockStatus?: boolean;
}

interface PreorderStateInput {
    isPreorder?: boolean;
    preorderEta?: string;
}

const CHANGE_TYPE_LABELS: Record<RunChangeTypeValue, string> = {
    price_decrease: "Price Decrease",
    price_increase: "Price Increase",
    new_product: "New Product",
    sold_out: "Sold Out",
    back_in_stock: "Back In Stock",
};

export const formatChangeTypeLabel = (changeType?: string): string => {
    if (!changeType) {
        return "-";
    }

    if (Object.prototype.hasOwnProperty.call(CHANGE_TYPE_LABELS, changeType)) {
        return CHANGE_TYPE_LABELS[changeType as RunChangeTypeValue];
    }

    return formatStatusLabel(changeType);
};

export const getChangePriceTagConfig = (value: ChangeDetailsInput): PriceTagProps | null => {
    switch (value.changeType) {
        case "new_product":
            return {
                variant: "new_product",
                price: value.newPrice ?? value.oldPrice,
            };
        case "price_increase":
            return {
                variant: "price_increase",
                oldPrice: value.oldPrice,
                newPrice: value.newPrice,
            };
        case "price_decrease":
            return {
                variant: "price_decrease",
                oldPrice: value.oldPrice,
                newPrice: value.newPrice,
            };
        default:
            return null;
    }
};

export const formatChangeDetails = (value: ChangeDetailsInput): string => {
    if (value.oldPrice !== undefined || value.newPrice !== undefined) {
        return `${formatPrice(value.oldPrice)} -> ${formatPrice(value.newPrice)}`;
    }

    if (value.oldStockStatus !== undefined || value.newStockStatus !== undefined) {
        const resolvedStockStatus = value.newStockStatus ?? value.oldStockStatus;

        if (resolvedStockStatus !== undefined) {
            return resolvedStockStatus ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock;
        }
    }

    return "State change recorded";
};

export const formatPreorderState = (value: PreorderStateInput): string => {
    if (!value.isPreorder) {
        return PREORDER_STATE_NO_LABEL;
    }

    return value.preorderEta
        ? `${PREORDER_BADGE_LABEL} (${PREORDER_ETA_LABEL} ${value.preorderEta})`
        : PREORDER_BADGE_LABEL;
};

const getRelativeTimeLabel = (value: string, now = new Date()): string => {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return "time unavailable";
    }

    const elapsedMs = Math.max(0, now.getTime() - parsedDate.getTime());
    const elapsedMinutes = Math.floor(elapsedMs / 60_000);

    if (elapsedMinutes < 1) {
        return "just now";
    }

    if (elapsedMinutes < 60) {
        return `${elapsedMinutes}m ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) {
        return `${elapsedHours}h ago`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d ago`;
};

export const formatLastChangeLabel = (value?: string, now = new Date()): string => {
    if (!value) {
        return "No changes yet";
    }

    return `${formatDateTime(value)} (${getRelativeTimeLabel(value, now)})`;
};
