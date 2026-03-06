import { SCRAPE_INTERVALS, type ScrapeInterval } from "@mabrik/shared";
import { useMemo, useState } from "react";
import { buildCategoryOptions, buildCategoryTreeData } from "../../categories/options";
import { useCategoriesQuery } from "../../categories/queries";
import type { UseSettingsAdminResult } from "../types/use-settings-admin.types";
import { useTriggerRunMutation, useUpdateCategorySettingsMutation } from "../mutations";
import { NOTIFICATION_MESSAGES } from "../../../shared/constants/notification-messages";
import { useAppNotification } from "../../../shared/hooks/use-app-notification";
import { normalizeUserError } from "../../../shared/utils/normalize-user-error";

export const useSettingsAdmin = (): UseSettingsAdminResult => {
    const categoriesQuery = useCategoriesQuery("all");
    const updateCategorySettingsMutation = useUpdateCategorySettingsMutation();
    const triggerRunMutation = useTriggerRunMutation();
    const { notify } = useAppNotification();
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedScrapeInterval, setSelectedScrapeInterval] = useState<ScrapeInterval | null>(null);

    const categoryOptions = useMemo(
        () => buildCategoryOptions(categoriesQuery.data?.categories ?? []),
        [categoriesQuery.data?.categories],
    );
    const categoryTreeData = useMemo(
        () => buildCategoryTreeData(categoriesQuery.data?.categories ?? []),
        [categoriesQuery.data?.categories],
    );
    const effectiveCategoryId = selectedCategoryId || categoryOptions[0]?.id || "";
    const selectedCategory = useMemo(
        () => categoriesQuery.data?.categories.find((category) => category.id === effectiveCategoryId) ?? null,
        [categoriesQuery.data?.categories, effectiveCategoryId],
    );
    const effectiveScrapeInterval = selectedScrapeInterval ?? selectedCategory?.scrapeIntervalHours ?? SCRAPE_INTERVALS[1];

    const onSelectCategory = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        const nextCategory = categoriesQuery.data?.categories.find((category) => category.id === categoryId);

        if (nextCategory) {
            setSelectedScrapeInterval(nextCategory.scrapeIntervalHours);
        }
    };

    const onSaveScrapeInterval = async () => {
        if (!effectiveCategoryId) {
            return;
        }

        try {
            await updateCategorySettingsMutation.mutateAsync({
                id: effectiveCategoryId,
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

    const onTriggerRun = async () => {
        if (!effectiveCategoryId) {
            return;
        }

        try {
            const result = await triggerRunMutation.mutateAsync({ categoryId: effectiveCategoryId });
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
        categoriesQuery,
        categoryTreeData,
        selectedCategoryId: effectiveCategoryId,
        selectedScrapeInterval: effectiveScrapeInterval,
        triggerRunResult: triggerRunMutation.data,
        isSavingInterval: updateCategorySettingsMutation.isPending,
        isTriggeringRun: triggerRunMutation.isPending,
        setSelectedCategoryId: onSelectCategory,
        setSelectedScrapeInterval,
        onSaveScrapeInterval,
        onTriggerRun,
    };
};
