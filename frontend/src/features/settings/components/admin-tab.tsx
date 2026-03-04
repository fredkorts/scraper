import { Link } from "@tanstack/react-router";
import { SCRAPE_INTERVALS } from "@mabrik/shared";
import { defaultRunDetailSectionSearch } from "../../runs/search";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsAdminTabProps } from "../types/settings-ui.types";
import styles from "../../../routes/settings-page.module.scss";

export const SettingsAdminTab = ({
    categoryOptions,
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
                    <select
                        className={styles.select}
                        value={selectedCategoryId}
                        onChange={(event) => onSelectCategory(event.target.value)}
                    >
                        {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={styles.field}>
                    <span className={styles.label}>Scrape interval</span>
                    <select
                        className={styles.select}
                        value={String(selectedScrapeInterval)}
                        onChange={(event) => onSelectScrapeInterval(Number(event.target.value) as (typeof SCRAPE_INTERVALS)[number])}
                    >
                        {SCRAPE_INTERVALS.map((interval) => (
                            <option key={interval} value={interval}>
                                {interval} hours
                            </option>
                        ))}
                    </select>
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
