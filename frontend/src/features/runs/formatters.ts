export {
    formatDateTime,
    formatDuration,
    formatFailurePhaseLabel,
    formatPrice,
    formatRetryableLabel,
    formatStatusLabel,
} from "../../shared/formatters/display";
import { STOCK_STATUS_LABELS } from "../../shared/constants/stock.constants";
import {
    PREORDER_BADGE_LABEL,
    PREORDER_ETA_LABEL,
    PREORDER_STATE_NO_LABEL,
} from "../../shared/constants/preorder.constants";
import { formatPrice } from "../../shared/formatters/display";
import type { PriceTagProps } from "../../components/price-tag/PriceTag";

type RunChangeTypeValue = "price_increase" | "price_decrease" | "new_product" | "sold_out" | "back_in_stock";

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
        const oldStockLabel = value.oldStockStatus ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock;
        const newStockLabel = value.newStockStatus ? STOCK_STATUS_LABELS.inStock : STOCK_STATUS_LABELS.outOfStock;

        return `${oldStockLabel} -> ${newStockLabel}`;
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
