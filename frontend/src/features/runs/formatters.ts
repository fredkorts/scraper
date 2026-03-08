export {
    formatDateTime,
    formatDuration,
    formatFailurePhaseLabel,
    formatPrice,
    formatRetryableLabel,
    formatStatusLabel,
} from "../../shared/formatters/display";
import { STOCK_STATUS_LABELS } from "../../shared/constants/stock.constants";
import { formatPrice } from "../../shared/formatters/display";

interface ChangeDetailsInput {
    oldPrice?: number;
    newPrice?: number;
    oldStockStatus?: boolean;
    newStockStatus?: boolean;
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
