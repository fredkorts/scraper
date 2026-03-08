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

interface ChangeDetailsInput {
    oldPrice?: number;
    newPrice?: number;
    oldStockStatus?: boolean;
    newStockStatus?: boolean;
}

interface PreorderStateInput {
    isPreorder?: boolean;
    preorderEta?: string;
}

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
