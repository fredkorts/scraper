import { AppTabs } from "../../../components/app-tabs/AppTabs";
import { SETTINGS_TAB_LABELS } from "../constants/settings.constants";
import { getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import { settingsTabSchema } from "../schemas";
import type { SettingsTabsProps } from "../types/settings-ui.types";
import styles from "./settings-tabs.module.scss";

export const SettingsTabs = ({ activeTab, visibleTabs, onSetTab }: SettingsTabsProps) => {
    const tabItems = visibleTabs.map((tab) => ({
        key: tab,
        label: <span id={getSettingsTabId(tab)}>{SETTINGS_TAB_LABELS[tab]}</span>,
    }));
    const selectOptions = visibleTabs.map((tab) => ({
        value: tab,
        label: SETTINGS_TAB_LABELS[tab],
    }));

    const handleTabChange = (key: string | undefined) => {
        if (!key) {
            return;
        }

        const parsed = settingsTabSchema.safeParse(key);

        if (!parsed.success || !visibleTabs.includes(parsed.data)) {
            return;
        }

        onSetTab(parsed.data);
    };

    return (
        <div className={styles.root}>
            <AppTabs
                ariaLabel="Settings sections"
                className={styles.desktopTabs}
                activeKey={activeTab}
                items={tabItems}
                onChange={handleTabChange}
            />
            <label className={styles.mobileSelectField}>
                <span className={styles.mobileSelectLabel}>Section</span>
                <select
                    aria-label="Settings section selector"
                    className={styles.mobileSelect}
                    value={activeTab}
                    onChange={(event) => handleTabChange(event.target.value)}
                >
                    {selectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
};
