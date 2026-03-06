import { useMemo, useState } from "react";
import { buildCategoryOptions, getCategoryDisplayLabel } from "../../categories/options";
import { useCategoriesQuery } from "../../categories/queries";
import { useCreateSubscriptionMutation, useDeleteSubscriptionMutation } from "../mutations";
import { useSubscriptionsQuery } from "../queries";
import { NOTIFICATION_MESSAGES } from "../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../shared/hooks/use-app-notification";
import { normalizeUserError } from "../../../shared/utils/normalize-user-error";

export interface UseSettingsTrackingResult {
    categoriesQuery: ReturnType<typeof useCategoriesQuery>;
    subscriptionsQuery: ReturnType<typeof useSubscriptionsQuery>;
    categoryOptions: ReturnType<typeof buildCategoryOptions>;
    availableCategoryOptions: ReturnType<typeof buildCategoryOptions>;
    categoryLabelById: Map<string, string>;
    selectedCategoryId: string;
    effectiveSelectedCategoryId: string;
    trackingError: string | null;
    isCreatePending: boolean;
    isDeletePending: boolean;
    setSelectedCategoryId: (categoryId: string) => void;
    onTrackCategory: () => Promise<void>;
    onUntrackCategory: (subscriptionId: string) => Promise<void>;
}

export const useSettingsTracking = (): UseSettingsTrackingResult => {
    const categoriesQuery = useCategoriesQuery("all");
    const subscriptionsQuery = useSubscriptionsQuery();
    const createSubscriptionMutation = useCreateSubscriptionMutation();
    const deleteSubscriptionMutation = useDeleteSubscriptionMutation();
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
            await deleteSubscriptionMutation.mutateAsync(subscriptionId);
            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.categoryUntracked.message,
                description: "The category is no longer tracked.",
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

    return {
        categoriesQuery,
        subscriptionsQuery,
        categoryOptions,
        availableCategoryOptions,
        categoryLabelById,
        selectedCategoryId,
        effectiveSelectedCategoryId,
        trackingError,
        isCreatePending: createSubscriptionMutation.isPending,
        isDeletePending: deleteSubscriptionMutation.isPending,
        setSelectedCategoryId,
        onTrackCategory,
        onUntrackCategory,
    };
};
