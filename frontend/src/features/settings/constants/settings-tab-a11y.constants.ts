import type { SettingsTab } from "../types/settings-schema.types";

export const getSettingsTabId = (tab: SettingsTab) => `settings-tab-${tab}`;
export const getSettingsPanelId = (tab: SettingsTab) => `settings-panel-${tab}`;
