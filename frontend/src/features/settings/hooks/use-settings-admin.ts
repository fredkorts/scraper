import { SCRAPE_INTERVALS, type ScrapeInterval } from "@mabrik/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { UseSettingsAdminResult } from "../types/use-settings-admin.types";
import { useTriggerRunMutation, useUpdateCategorySettingsMutation } from "../mutations";
import { NOTIFICATION_MESSAGES } from "../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../shared/hooks/use-app-notification";
import { normalizeUserError } from "../../../shared/utils/normalize-user-error";
import { useAdminSchedulerStateQuery } from "../queries";
import type { AdminSchedulerStateItemData } from "../types/settings-schema.types";
import { buildCategoryTreeData } from "../../categories";
import { categoriesQueryOptions } from "../../categories";

export const useSettingsAdmin = (enabled: boolean): UseSettingsAdminResult => {
    const categoriesQuery = useQuery({ ...categoriesQueryOptions("all"), enabled });
    const schedulerStateQuery = useAdminSchedulerStateQuery(enabled);
    const updateCategorySettingsMutation = useUpdateCategorySettingsMutation();
    const triggerRunMutation = useTriggerRunMutation();
    const { notify } = useAppNotification();
    const [selectedIntervalCategoryId, setSelectedIntervalCategoryId] = useState("");
    const [selectedTriggerCategoryId, setSelectedTriggerCategoryId] = useState("");
    const [selectedScrapeInterval, setSelectedScrapeInterval] = useState<ScrapeInterval | null>(null);

    const schedulerStateItems = useMemo(() => schedulerStateQuery.data?.items ?? [], [schedulerStateQuery.data?.items]);
    const schedulerStateItemsById = useMemo(
        () => new Map(schedulerStateItems.map((item) => [item.categoryId, item])),
        [schedulerStateItems],
    );
    const schedulerStateCategoryIds = useMemo(
        () => new Set(schedulerStateItems.map((item) => item.categoryId)),
        [schedulerStateItems],
    );
    const triggerCategoryIds = useMemo(
        () => new Set(schedulerStateItems.filter((item) => item.isActive).map((item) => item.categoryId)),
        [schedulerStateItems],
    );
    const schedulerStateCategoryTreeData = useMemo(
        () =>
            buildCategoryTreeData(categoriesQuery.data?.categories ?? [], {
                includeCategoryIds: schedulerStateCategoryIds,
                disableExcludedCategories: false,
            }),
        [categoriesQuery.data?.categories, schedulerStateCategoryIds],
    );
    const triggerCategoryTreeData = useMemo(
        () =>
            buildCategoryTreeData(categoriesQuery.data?.categories ?? [], {
                includeCategoryIds: triggerCategoryIds,
            }),
        [categoriesQuery.data?.categories, triggerCategoryIds],
    );
    const triggerCategoryIdsOrdered = useMemo(
        () => schedulerStateItems.filter((item) => item.isActive).map((item) => item.categoryId),
        [schedulerStateItems],
    );
    const effectiveIntervalCategoryId = selectedIntervalCategoryId;
    const effectiveTriggerCategoryId = selectedTriggerCategoryId || triggerCategoryIdsOrdered[0] || "";
    const selectedIntervalCategory = schedulerStateItemsById.get(effectiveIntervalCategoryId);
    const effectiveScrapeInterval =
        selectedScrapeInterval ?? selectedIntervalCategory?.scrapeIntervalHours ?? SCRAPE_INTERVALS[1];

    const onSelectIntervalCategory = (categoryId: string) => {
        setSelectedIntervalCategoryId(categoryId);
        const nextCategory = schedulerStateItemsById.get(categoryId);

        if (nextCategory) {
            setSelectedScrapeInterval(nextCategory.scrapeIntervalHours);
            return;
        }

        setSelectedScrapeInterval(null);
    };

    const onSelectTriggerCategory = (categoryId: string) => {
        setSelectedTriggerCategoryId(categoryId);
    };

    const prefillIntervalFromTable = (categoryId: string) => {
        const category = schedulerStateItemsById.get(categoryId);
        if (!category) {
            return;
        }

        setSelectedIntervalCategoryId(categoryId);
        setSelectedScrapeInterval(category.scrapeIntervalHours);
        notify({
            variant: "info",
            message: "Interval editor prefilled",
            description: `Ready to update ${category.categoryPathNameEt}.`,
            key: "settings:admin:prefill-interval",
        });
    };

    const getTriggerDisabledReason = (item: AdminSchedulerStateItemData | undefined): string | null => {
        if (!item) {
            return "Select a category to trigger a scrape.";
        }

        if (!item.isActive) {
            return "This category is inactive and cannot be scraped.";
        }

        if (item.queueStatus === "active") {
            return "A scrape job is currently running for this category.";
        }

        return null;
    };

    const getTriggerDisabledReasonByCategoryId = (categoryId: string): string | null =>
        getTriggerDisabledReason(schedulerStateItemsById.get(categoryId));

    const onSaveScrapeInterval = async () => {
        if (!effectiveIntervalCategoryId) {
            return;
        }

        try {
            await updateCategorySettingsMutation.mutateAsync({
                id: effectiveIntervalCategoryId,
                payload: {
                    scrapeIntervalHours: effectiveScrapeInterval,
                },
            });
            notify({
                variant: "success",
                message: NOTIFICATION_MESSAGES.settings.intervalSaved.message,
                description: `Interval updated to every ${effectiveScrapeInterval} hours.`,
                key: "settings:admin:interval",
            });
        } catch (error) {
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.intervalSaveFailed.message,
                description: normalizeUserError(error, "Failed to save scrape interval"),
                key: "settings:admin:interval",
            });
        }
    };

    const onTriggerRun = async (categoryId?: string) => {
        const targetCategoryId = categoryId ?? effectiveTriggerCategoryId;
        if (!targetCategoryId) {
            return;
        }

        const disabledReason = getTriggerDisabledReasonByCategoryId(targetCategoryId);
        if (disabledReason) {
            notify({
                variant: "info",
                message: "Scrape not queued",
                description: disabledReason,
                key: `settings:admin:trigger-run:${targetCategoryId}`,
            });
            return;
        }

        try {
            const result = await triggerRunMutation.mutateAsync({ categoryId: targetCategoryId, force: true });
            notify({
                variant: "info",
                message: NOTIFICATION_MESSAGES.settings.runTriggered.message,
                description:
                    result.mode === "queued"
                        ? `Run request queued as job ${result.jobId ?? "pending"}.`
                        : `Run started with id ${result.scrapeRunId ?? "pending"}.`,
                key: "settings:admin:trigger-run",
            });
        } catch (error) {
            notify({
                variant: "error",
                message: NOTIFICATION_MESSAGES.settings.runTriggerFailed.message,
                description: normalizeUserError(error, "Failed to trigger scrape"),
                key: "settings:admin:trigger-run",
            });
        }
    };

    return {
        schedulerStateQuery,
        schedulerStateItems,
        schedulerStateCategoryTreeData,
        triggerCategoryTreeData,
        schedulerStateGeneratedAt: schedulerStateQuery.data?.generatedAt,
        selectedIntervalCategoryId: effectiveIntervalCategoryId,
        selectedTriggerCategoryId: effectiveTriggerCategoryId,
        selectedScrapeInterval: effectiveScrapeInterval,
        triggerRunResult: triggerRunMutation.data,
        isSavingInterval: updateCategorySettingsMutation.isPending,
        isTriggeringRun: triggerRunMutation.isPending,
        setSelectedIntervalCategoryId: onSelectIntervalCategory,
        setSelectedTriggerCategoryId: onSelectTriggerCategory,
        setSelectedScrapeInterval,
        prefillIntervalFromTable,
        onSaveScrapeInterval,
        onTriggerRun,
        getTriggerDisabledReason,
        getTriggerDisabledReasonByCategoryId,
    };
};
