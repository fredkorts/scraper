import { Link } from "@tanstack/react-router";
import { SCRAPE_INTERVALS } from "@mabrik/shared";
import { AppSelect } from "../../../components/app-select/AppSelect";
import { CategoryTreeSelect } from "../../../features/categories/components/category-tree-select";
import { defaultRunDetailSectionSearch } from "../../runs/search";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsAdminTabProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsAdminTab = ({
    categoryTreeData,
    selectedCategoryId,
    selectedScrapeInterval,
    triggerRunResult,
    isSavingInterval,
    isTriggeringRun,
    onSelectCategory,
    onSelectScrapeInterval,
    onSaveScrapeInterval,
    onTriggerRun,
}: SettingsAdminTabProps) => (
    <section
        id={getSettingsPanelId("admin")}
        className={styles.section}
        role="tabpanel"
        aria-labelledby={getSettingsTabId("admin")}
    >
        <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Admin Controls</h2>
            <div className={styles.inlineForm}>
                <label className={styles.field}>
                    <span className={styles.label}>Category</span>
                    <CategoryTreeSelect
                        ariaLabel="Category"
                        className={styles.select}
                        treeData={categoryTreeData}
                        value={selectedCategoryId || undefined}
                        onChange={(value) => onSelectCategory(value ?? "")}
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
                <button
                    type="button"
                    onClick={() => void onSaveScrapeInterval()}
                    disabled={!selectedCategoryId || isSavingInterval}
                >
                    {isSavingInterval ? "Saving..." : "Save interval"}
                </button>
            </div>
        </article>
        <article className={styles.card}>
            <h3 className={styles.cardTitle}>Manual scrape trigger</h3>
            <div className={styles.inlineForm}>
                <button
                    type="button"
                    onClick={() => void onTriggerRun()}
                    disabled={!selectedCategoryId || isTriggeringRun}
                >
                    {isTriggeringRun ? "Triggering..." : "Scrape now"}
                </button>
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
            </div>
        </article>
    </section>
);
