import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Alert, Empty, Space, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { AppButton } from "../../../../components/app-button/AppButton";
import { useMeQuery } from "../../../auth";
import { useTrackProductMutation, useUntrackProductMutation } from "../../../settings";
import { defaultRunsListSearch } from "../../../runs";
import { ProductDetailView } from "../../components/product-detail-view";
import { defaultProductHistoryControls } from "../../history-controls";
import { useProductDetailPageViewModel } from "../../hooks/use-product-detail-page-view-model";
import { useProductHistoryColumns } from "../../hooks/use-product-history-columns";
import { useProductDetailQuery, useProductHistoryQuery } from "../../queries";
import { queryKeys } from "../../../../lib/query/query-keys";
import { NOTIFICATION_MESSAGES } from "../../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../../shared/hooks/use-app-notification";
import { useRouteSearchUpdater } from "../../../../shared/hooks/use-route-search-updater";
import { normalizeUserError } from "../../../../shared/utils/normalize-user-error";
import styles from "./product-detail-page-view.module.scss";

export const ProductDetailPageView = () => {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const watchIntentRef = useRef(0);
    const [optimisticWatchState, setOptimisticWatchState] = useState<boolean | null>(null);
    const queryClient = useQueryClient();
    const { notify } = useAppNotification();
    const session = useMeQuery();
    const navigate = useNavigate({ from: "/app/products/$productId" });
    const { productId } = useParams({ from: "/app/products/$productId" });
    const search = useSearch({ from: "/app/products/$productId" });
    const effectiveControls = {
        ...search,
        categoryId: undefined,
        stockFilter: defaultProductHistoryControls.stockFilter,
        showOriginalPrice: defaultProductHistoryControls.showOriginalPrice,
        showStockOverlay: defaultProductHistoryControls.showStockOverlay,
    };
    const detailQuery = useProductDetailQuery(productId);
    const historyQuery = useProductHistoryQuery(productId);
    const trackProductMutation = useTrackProductMutation();
    const untrackProductMutation = useUntrackProductMutation();
    const setSearch = useRouteSearchUpdater(navigate);
    const historyColumns = useProductHistoryColumns();
    const historyItems = historyQuery.data?.items ?? [];
    const viewModel = useProductDetailPageViewModel(detailQuery.data?.product, historyItems, effectiveControls);
    const canToggleWatch = session.data?.capabilities?.productWatchlist ?? false;
    const isWatchPending = trackProductMutation.isPending || untrackProductMutation.isPending;
    const resolvedWatchState = optimisticWatchState ?? detailQuery.data?.product.isWatched ?? false;

    const setProductWatchState = (isWatched: boolean, trackedProductId?: string) => {
        queryClient.setQueryData(queryKeys.products.detail(productId), (currentData: typeof detailQuery.data) => {
            if (!currentData) {
                return currentData;
            }

            return {
                ...currentData,
                product: {
                    ...currentData.product,
                    isWatched,
                    trackedProductId,
                },
            };
        });
    };

    const onToggleWatch = async () => {
        if (!detailQuery.data || !canToggleWatch || isWatchPending) {
            return;
        }

        const nextWatchState = !resolvedWatchState;
        const intentId = ++watchIntentRef.current;
        setOptimisticWatchState(nextWatchState);

        try {
            if (nextWatchState) {
                const result = await trackProductMutation.mutateAsync(productId);
                if (intentId !== watchIntentRef.current) {
                    return;
                }

                setProductWatchState(true, result.item.id);
                notify({
                    variant: "success",
                    message: NOTIFICATION_MESSAGES.settings.productWatched.message,
                    description: `${detailQuery.data.product.name} is now tracked.`,
                    key: "settings:tracking:product-watch",
                });
            } else {
                await untrackProductMutation.mutateAsync(productId);
                if (intentId !== watchIntentRef.current) {
                    return;
                }

                setProductWatchState(false, undefined);
                notify({
                    variant: "success",
                    message: NOTIFICATION_MESSAGES.settings.productUnwatched.message,
                    description: `${detailQuery.data.product.name} is no longer tracked.`,
                    key: "settings:tracking:product-unwatch",
                });
            }
        } catch (error) {
            if (intentId !== watchIntentRef.current) {
                return;
            }

            notify({
                variant: "error",
                message: nextWatchState
                    ? NOTIFICATION_MESSAGES.settings.productWatchFailed.message
                    : NOTIFICATION_MESSAGES.settings.productUnwatchFailed.message,
                description: normalizeUserError(error, "Unable to update watch state."),
                key: "settings:tracking:product-watch-error",
            });
        } finally {
            if (intentId === watchIntentRef.current) {
                setOptimisticWatchState(null);
            }
        }
    };

    useEffect(() => {
        headingRef.current?.focus();
    }, [productId]);

    useEffect(() => {
        setOptimisticWatchState(null);
    }, [productId, detailQuery.data?.product.isWatched]);

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
            <ProductDetailView
                canToggleWatch={canToggleWatch}
                controls={effectiveControls}
                headingRef={headingRef}
                historyColumns={historyColumns}
                historyErrorMessage={historyQuery.isError ? historyQuery.error.message : undefined}
                isHistoryLoading={historyQuery.isPending}
                isWatchPending={isWatchPending}
                product={{
                    ...detailQuery.data.product,
                    isWatched: resolvedWatchState,
                }}
                viewModel={viewModel}
                onToggleWatch={() => void onToggleWatch()}
                onResetFilters={() =>
                    setSearch({
                        range: defaultProductHistoryControls.range,
                    })
                }
                onRetryHistory={() => void historyQuery.refetch()}
                onSetRange={(value) => setSearch({ range: value })}
            />
        </section>
    );
};
