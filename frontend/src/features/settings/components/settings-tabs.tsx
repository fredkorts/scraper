import type { KeyboardEvent } from "react";
import { SETTINGS_TAB_LABELS } from "../constants/settings.constants";
import { getSettingsPanelId, getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import type { SettingsTabsProps } from "../types/settings-ui.types";
import styles from "./settings-shared.module.scss";

export const SettingsTabs = ({ activeTab, visibleTabs, onSetTab }: SettingsTabsProps) => {
    const currentIndex = visibleTabs.indexOf(activeTab);

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") {
            return;
        }

        event.preventDefault();

        if (event.key === "Home") {
            const first = visibleTabs[0];
            if (first) {
                onSetTab(first);
            }
            return;
        }

        if (event.key === "End") {
            const last = visibleTabs.at(-1);
            if (last) {
                onSetTab(last);
            }
            return;
        }

        const delta = event.key === "ArrowLeft" ? -1 : 1;
        const nextIndex = (currentIndex + delta + visibleTabs.length) % visibleTabs.length;
        const nextTab = visibleTabs[nextIndex];

        if (nextTab) {
            onSetTab(nextTab);
        }
    };

    return (
        <div className={styles.tabBar} role="tablist" aria-label="Settings sections">
            {visibleTabs.map((tab) => (
                <button
                    key={tab}
                    id={getSettingsTabId(tab)}
                    type="button"
                    className={styles.tabButton}
                    data-active={activeTab === tab}
                    onClick={() => onSetTab(tab)}
                    onKeyDown={onKeyDown}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={getSettingsPanelId(tab)}
                    tabIndex={activeTab === tab ? 0 : -1}
                >
                    {SETTINGS_TAB_LABELS[tab]}
                </button>
            ))}
        </div>
    );
};
