import type { SettingsTab } from "./settings-schema.types";

export interface UseSettingsTabsResult {
    activeTab: SettingsTab;
    visibleTabs: SettingsTab[];
    setTab: (tab: SettingsTab) => void;
}
