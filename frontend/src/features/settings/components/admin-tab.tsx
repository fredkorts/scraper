import { Link } from "@tanstack/react-router";
import { SCRAPE_INTERVALS } from "@mabrik/shared";
import { SettingOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { AppButton } from "../../../components/app-button/AppButton";
import { AppSelect } from "../../../components/app-select/AppSelect";
import { CategoryTreeSelect } from "../../../components/category-tree-select/CategoryTreeSelect";
import { defaultRunDetailSectionSearch } from "../../runs/search";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import { AdminSchedulerStateTable } from "./admin-scheduler-state-table";
import type { SettingsAdminTabProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsAdminTab = ({
    schedulerStateItems,
    schedulerStateCategoryTreeData,
    triggerCategoryTreeData,
    schedulerStateGeneratedAt,
    schedulerStateError,
    isSchedulerStateLoading,
    selectedIntervalCategoryId,
    selectedTriggerCategoryId,
    selectedScrapeInterval,
    triggerRunResult,
    isSavingInterval,
    isTriggeringRun,
    onRetrySchedulerState,
    onSelectIntervalCategory,
    onSelectTriggerCategory,
    onSelectScrapeInterval,
    onEditIntervalFromTable,
    onSaveScrapeInterval,
    onTriggerRun,
    getTriggerDisabledReasonByCategoryId,
}: SettingsAdminTabProps) => {
    const selectedTriggerDisabledReason = getTriggerDisabledReasonByCategoryId(selectedTriggerCategoryId);

    return (
        <section
            id={getSettingsPanelId("admin")}
            className={styles.section}
            role="tabpanel"
            aria-labelledby={getSettingsTabId("admin")}
        >
            <AdminSchedulerStateTable
                items={schedulerStateItems}
                categoryTreeData={schedulerStateCategoryTreeData}
                generatedAt={schedulerStateGeneratedAt}
                isLoading={isSchedulerStateLoading}
                error={schedulerStateError}
                isTriggeringRun={isTriggeringRun}
                onRetry={onRetrySchedulerState}
                onEditInterval={onEditIntervalFromTable}
                onTriggerRun={onTriggerRun}
                getTriggerDisabledReason={(item) => getTriggerDisabledReasonByCategoryId(item.categoryId)}
            />
            <article className={styles.card}>
                <h3 className={styles.cardTitle}>Interval update</h3>
                <div className={styles.inlineForm}>
                    <label className={styles.field}>
                        <span className={styles.label}>Category</span>
                        <CategoryTreeSelect
                            ariaLabel="Category"
                            className={styles.select}
                            disabled={!schedulerStateCategoryTreeData.length}
                            treeData={schedulerStateCategoryTreeData}
                            placeholder="Select scheduler category"
                            value={selectedIntervalCategoryId || undefined}
                            onChange={(value) => onSelectIntervalCategory(value ?? "")}
                        />
                    </label>
                    <label className={styles.field}>
                        <span className={styles.label}>Scrape interval</span>
                        <AppSelect
                            ariaLabel="Scrape interval"
                            className={styles.select}
                            options={SCRAPE_INTERVALS.map((interval) => ({
                                label: `${interval} hours`,
                                value: String(interval),
                            }))}
                            value={String(selectedScrapeInterval)}
                            onChange={(value) => {
                                if (!value) {
                                    return;
                                }

                                onSelectScrapeInterval(Number(value) as (typeof SCRAPE_INTERVALS)[number]);
                            }}
                        />
                    </label>
                    <AppButton
                        intent="secondary"
                        icon={<SettingOutlined />}
                        size="large"
                        isLoading={isSavingInterval}
                        onClick={() => void onSaveScrapeInterval()}
                        disabled={!selectedIntervalCategoryId}
                    >
                        Save interval
                    </AppButton>
                </div>
            </article>
            <article className={styles.card}>
                <h3 className={styles.cardTitle}>Manual scrape trigger</h3>
                <div className={styles.inlineForm}>
                    <label className={styles.field}>
                        <span className={styles.label}>Category</span>
                        <CategoryTreeSelect
                            ariaLabel="Category"
                            className={styles.select}
                            disabled={!triggerCategoryTreeData.length}
                            treeData={triggerCategoryTreeData}
                            placeholder="Select active category"
                            value={selectedTriggerCategoryId || undefined}
                            onChange={(value) => onSelectTriggerCategory(value ?? "")}
                        />
                    </label>
                    <AppButton
                        intent="warning"
                        icon={<ThunderboltOutlined />}
                        size="large"
                        isLoading={isTriggeringRun}
                        title={selectedTriggerDisabledReason ?? undefined}
                        disabled={!selectedTriggerCategoryId || selectedTriggerDisabledReason !== null}
                        onClick={() => void onTriggerRun()}
                    >
                        Scrape now
                    </AppButton>
                    {triggerRunResult?.jobId ? (
                        <span className={styles.subtle}>Queued job {triggerRunResult.jobId}</span>
                    ) : null}
                    {triggerRunResult?.scrapeRunId ? (
                        <Link
                            params={{ runId: triggerRunResult.scrapeRunId }}
                            search={defaultRunDetailSectionSearch}
                            to="/app/runs/$runId"
                        >
                            Open run detail
                        </Link>
                    ) : null}
                    {selectedTriggerCategoryId && selectedTriggerDisabledReason ? (
                        <span className={styles.subtle}>{selectedTriggerDisabledReason}</span>
                    ) : null}
                </div>
            </article>
        </section>
    );
};
