import { Alert, Empty, Space, Typography } from "antd";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppButton } from "../components/app-button/AppButton";
import { ProductDetailView } from "../features/products/components/product-detail-view";
import { defaultProductHistoryControls } from "../features/products/history-controls";
import { useProductHistoryColumns } from "../features/products/hooks/use-product-history-columns";
import { useProductDetailPageViewModel } from "../features/products/hooks/use-product-detail-page-view-model";
import { useProductDetailQuery, useProductHistoryQuery } from "../features/products/queries";
import { defaultRunsListSearch } from "../features/runs/search";
import { useRouteSearchUpdater } from "../shared/hooks/use-route-search-updater";
import styles from "./product-detail-page.module.scss";

export const ProductDetailPage = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate({ from: "/app/products/$productId" });
    const { productId } = useParams({ from: "/app/products/$productId" });
    const search = useSearch({ from: "/app/products/$productId" });
    const detailQuery = useProductDetailQuery(productId);
    const historyQuery = useProductHistoryQuery(productId);
    const setSearch = useRouteSearchUpdater(navigate);
    const historyColumns = useProductHistoryColumns();
    const historyItems = historyQuery.data?.items ?? [];
    const viewModel = useProductDetailPageViewModel(detailQuery.data?.product, historyItems, search);

    useEffect(() => {
        headingRef.current?.focus();
    }, [productId]);

    if (detailQuery.isError) {
        return (
            <section className={styles.page}>
                <Typography.Title level={1} ref={headingRef} tabIndex={-1}>
                    Product Detail
                </Typography.Title>
                <Alert
                    action={
                        <Space>
                            <AppButton size="small" onClick={() => void detailQuery.refetch()}>
                                Retry
                            </AppButton>
                            <AppButton
                                intent="secondary"
                                size="small"
                                onClick={() =>
                                    void navigate({
                                        to: "/app/runs",
                                        search: defaultRunsListSearch,
                                    })
                                }
                            >
                                Back to runs
                            </AppButton>
                        </Space>
                    }
                    description={detailQuery.error.message}
                    title="Failed to load product detail"
                    showIcon
                    type="error"
                />
            </section>
        );
    }

    if (!detailQuery.data) {
        return (
            <section className={styles.page}>
                <Typography.Title level={1} ref={headingRef} tabIndex={-1}>
                    Product Detail
                </Typography.Title>
                <Empty description="Loading product detail..." />
            </section>
        );
    }

    return (
        <section className={styles.page}>
            <Typography.Title level={1} ref={headingRef} tabIndex={-1}>
                Product Detail
            </Typography.Title>
            <ProductDetailView
                controls={search}
                historyColumns={historyColumns}
                historyErrorMessage={historyQuery.isError ? historyQuery.error.message : undefined}
                isHistoryLoading={historyQuery.isPending}
                product={detailQuery.data.product}
                viewModel={viewModel}
                onResetFilters={() =>
                    setSearch({
                        range: defaultProductHistoryControls.range,
                        categoryId: undefined,
                        stockFilter: defaultProductHistoryControls.stockFilter,
                        showOriginalPrice: defaultProductHistoryControls.showOriginalPrice,
                        showStockOverlay: defaultProductHistoryControls.showStockOverlay,
                    })
                }
                onRetryHistory={() => void historyQuery.refetch()}
                onSetCategoryId={(value) => setSearch({ categoryId: value })}
                onSetRange={(value) => setSearch({ range: value })}
                onSetShowOriginalPrice={(checked) => setSearch({ showOriginalPrice: checked })}
                onSetShowStockOverlay={(checked) => setSearch({ showStockOverlay: checked })}
                onSetStockFilter={(value) => setSearch({ stockFilter: value })}
            />
        </section>
    );
};
