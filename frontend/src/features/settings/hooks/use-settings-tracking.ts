import { useMemo, useState } from "react";
import { buildCategoryOptions, buildCategoryTreeData, getCategoryDisplayLabel } from "../../categories";
import { useCategoriesQuery } from "../../categories";
import { useCreateSubscriptionMutation, useDeleteSubscriptionMutation, useUntrackProductMutation } from "../mutations";
import { useSubscriptionsQuery, useTrackedProductsQuery } from "../queries";
import type { UseSettingsTrackingResult } from "../types/use-settings-tracking.types";
import { NOTIFICATION_MESSAGES } from "../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../shared/hooks/use-app-notification";
import { normalizeUserError } from "../../../shared/utils/normalize-user-error";

export const useSettingsTracking = (canTrackProducts: boolean): UseSettingsTrackingResult => {
    const categoriesQuery = useCategoriesQuery("all");
    const subscriptionsQuery = useSubscriptionsQuery();
    const trackedProductsQuery = useTrackedProductsQuery(canTrackProducts);
    const createSubscriptionMutation = useCreateSubscriptionMutation();
    const deleteSubscriptionMutation = useDeleteSubscriptionMutation();
    const untrackProductMutation = useUntrackProductMutation();
    const { notify } = useAppNotification();
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [trackingError, setTrackingError] = useState<string | null>(null);

    const trackedCategoryIds = useMemo(
        () => new Set((subscriptionsQuery.data?.items ?? []).map((item) => item.category.id)),
        [subscriptionsQuery.data?.items],
    );
    const categoryOptions = useMemo(
        () => buildCategoryOptions(categoriesQuery.data?.categories ?? []),
        [categoriesQuery.data?.categories],
    );
    const availableCategoryOptions = useMemo(
        () => categoryOptions.filter((category) => !trackedCategoryIds.has(category.id)),
        [categoryOptions, trackedCategoryIds],
    );
    const availableCategoryIds = useMemo(
        () => new Set(availableCategoryOptions.map((category) => category.id)),
        [availableCategoryOptions],
    );
    const availableCategoryTreeData = useMemo(
        () =>
            buildCategoryTreeData(categoriesQuery.data?.categories ?? [], {
                includeCategoryIds: availableCategoryIds,
            }),
        [availableCategoryIds, categoriesQuery.data?.categories],
    );
    const categoryLabelById = useMemo(
        () =>
            new Map(
                (categoriesQuery.data?.categories ?? []).map((category) => [
                    category.id,
                    getCategoryDisplayLabel(category),
                ]),
            ),
        [categoriesQuery.data?.categories],
    );
    const effectiveSelectedCategoryId = selectedCategoryId || availableCategoryOptions[0]?.id || "";

    const onTrackCategory = async () => {
        if (!effectiveSelectedCategoryId) {
            return;
        }

        setTrackingError(null);

        try {
            await createSubscriptionMutation.mutateAsync(effectiveSelectedCategoryId);
            const categoryLabel = categoryLabelById.get(effectiveSelectedCategoryId) ?? "Category";

            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.categoryTracked.message,
                description: `${categoryLabel} is now tracked.`,
                key: "settings:tracking:create",
            });
            setSelectedCategoryId("");
        } catch (error) {
            const normalizedMessage = normalizeUserError(error, "Failed to track category");
            setTrackingError(normalizedMessage);
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.categoryTrackFailed.message,
                description: normalizedMessage,
                key: "settings:tracking:create",
            });
        }
    };

    const onUntrackCategory = async (subscriptionId: string) => {
        try {
            const result = await deleteSubscriptionMutation.mutateAsync(subscriptionId);
            const autoDisabledWatchCount = result.autoDisabledWatchCount ?? 0;
            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.categoryUntracked.message,
                description:
                    autoDisabledWatchCount > 0
                        ? `The category is no longer tracked. ${autoDisabledWatchCount} watched product${autoDisabledWatchCount === 1 ? "" : "s"} were auto-disabled.`
                        : "The category is no longer tracked.",
                key: "settings:tracking:delete",
            });
        } catch (error) {
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.categoryUntrackFailed.message,
                description: normalizeUserError(error, "Failed to remove tracking"),
                key: "settings:tracking:delete",
            });
        }
    };

    const onUntrackProduct = async (productId: string, productName: string) => {
        try {
            await untrackProductMutation.mutateAsync(productId);
            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.productUnwatched.message,
                description: `${productName} is no longer tracked.`,
                key: "settings:tracking:product-unwatch",
            });
        } catch (error) {
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.productUnwatchFailed.message,
                description: normalizeUserError(error, "Failed to stop tracking product"),
                key: "settings:tracking:product-unwatch",
            });
        }
    };

    return {
        categoriesQuery,
        subscriptionsQuery,
        trackedProductsQuery,
        categoryOptions,
        availableCategoryOptions,
        availableCategoryTreeData,
        categoryLabelById,
        selectedCategoryId,
        effectiveSelectedCategoryId,
        trackingError,
        isCreatePending: createSubscriptionMutation.isPending,
        isDeletePending: deleteSubscriptionMutation.isPending,
        isUntrackProductPending: untrackProductMutation.isPending,
        setSelectedCategoryId,
        onTrackCategory,
        onUntrackCategory,
        onUntrackProduct,
    };
};
