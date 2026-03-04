import { SCRAPE_INTERVALS, type ScrapeInterval } from "@mabrik/shared";
import { useMemo, useState } from "react";
import { buildCategoryOptions } from "../../categories/options";
import { useCategoriesQuery } from "../../categories/queries";
import { useTriggerRunMutation, useUpdateCategorySettingsMutation } from "../mutations";

export interface UseSettingsAdminResult {
    categoriesQuery: ReturnType<typeof useCategoriesQuery>;
    categoryOptions: ReturnType<typeof buildCategoryOptions>;
    selectedCategoryId: string;
    selectedScrapeInterval: ScrapeInterval;
    triggerRunResult: ReturnType<typeof useTriggerRunMutation>["data"];
    isSavingInterval: boolean;
    isTriggeringRun: boolean;
    setSelectedCategoryId: (categoryId: string) => void;
    setSelectedScrapeInterval: (scrapeInterval: ScrapeInterval) => void;
    onSaveScrapeInterval: () => Promise<void>;
    onTriggerRun: () => Promise<void>;
}

export const useSettingsAdmin = (): UseSettingsAdminResult => {
    const categoriesQuery = useCategoriesQuery("all");
    const updateCategorySettingsMutation = useUpdateCategorySettingsMutation();
    const triggerRunMutation = useTriggerRunMutation();
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedScrapeInterval, setSelectedScrapeInterval] = useState<ScrapeInterval | null>(null);

    const categoryOptions = useMemo(
        () => buildCategoryOptions(categoriesQuery.data?.categories ?? []),
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

        await updateCategorySettingsMutation.mutateAsync({
            id: effectiveCategoryId,
            payload: {
                scrapeIntervalHours: effectiveScrapeInterval,
            },
        });
    };

    const onTriggerRun = async () => {
        if (!effectiveCategoryId) {
            return;
        }

        await triggerRunMutation.mutateAsync({ categoryId: effectiveCategoryId });
    };

    return {
        categoriesQuery,
        categoryOptions,
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
