import { AppTabs } from "../../../components/app-tabs/AppTabs";
import { SETTINGS_TAB_LABELS } from "../constants/settings.constants";
import { getSettingsTabId } from "../constants/settings-tab-a11y.constants";
import { settingsTabSchema } from "../schemas";
import type { SettingsTabsProps } from "../types/settings-ui.types";

export const SettingsTabs = ({ activeTab, visibleTabs, onSetTab }: SettingsTabsProps) => {
    const tabItems = visibleTabs.map((tab) => ({
        key: tab,
        label: <span id={getSettingsTabId(tab)}>{SETTINGS_TAB_LABELS[tab]}</span>,
    }));

    return (
        <AppTabs
            ariaLabel="Settings sections"
            activeKey={activeTab}
            items={tabItems}
            onChange={(key) => {
                const parsed = settingsTabSchema.safeParse(key);

                if (!parsed.success || !visibleTabs.includes(parsed.data)) {
                    return;
                }

                onSetTab(parsed.data);
            }}
        />
    );
};
