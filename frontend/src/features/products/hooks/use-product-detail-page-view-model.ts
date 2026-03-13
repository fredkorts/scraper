import type { ProductHistoryControls } from "../history-controls";
import { useProductHistoryViewModel } from "./use-product-history-view-model";
import type { ProductDetailData, ProductHistoryData } from "../schemas";
import { getProductDiscountState, getProductFreshnessState } from "../utils/product-detail-view";

export const useProductDetailPageViewModel = (
    product: ProductDetailData["product"] | null | undefined,
    historyItems: ProductHistoryData["items"],
    controls: ProductHistoryControls,
) => {
    const history = useProductHistoryViewModel(historyItems, controls);
    const freshness = product
        ? getProductFreshnessState(product.lastSeenAt)
        : {
              isStale: false,
              relativeLabel: "Updated time unavailable",
          };
    const discount = product
        ? getProductDiscountState(product.currentPrice, product.originalPrice)
        : {
              hasOriginalPrice: false,
              hasDiscount: false,
          };

    const historyScreenReaderSummary = `Filtered history has ${history.historySummary.pointCount} snapshots. Latest price is ${history.historySummary.latestPrice ?? "unavailable"}. Min price is ${history.historySummary.minPrice ?? "unavailable"}. Max price is ${history.historySummary.maxPrice ?? "unavailable"}.`;
    const historyVisualMode: "empty" | "sparse" | "chart" =
        history.historySummary.pointCount === 0 ? "empty" : history.historySummary.pointCount < 3 ? "sparse" : "chart";
    const discountBadgeLabel =
        discount.hasDiscount && typeof discount.discountPercent === "number"
            ? `${discount.discountPercent}% below original`
            : undefined;

    return {
        history,
        freshness,
        discount,
        discountBadgeLabel,
        historyVisualMode,
        historyScreenReaderSummary,
    };
};
