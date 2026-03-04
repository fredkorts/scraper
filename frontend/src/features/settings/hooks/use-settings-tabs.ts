import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { SETTINGS_TAB_ORDER } from "../constants/settings.constants";
import { defaultSettingsSearch } from "../search";
import type { SettingsTab } from "../types/settings-schema.types";

export interface UseSettingsTabsResult {
    activeTab: SettingsTab;
    visibleTabs: SettingsTab[];
    setTab: (tab: SettingsTab) => void;
}

export const useSettingsTabs = (isAdmin: boolean): UseSettingsTabsResult => {
    const navigate = useNavigate({ from: "/app/settings" });
    const search = useSearch({ from: "/app/settings" });

    const activeTab = isAdmin || search.tab !== "admin" ? search.tab : defaultSettingsSearch.tab;
    const visibleTabs = useMemo(
        () => SETTINGS_TAB_ORDER.filter((tab) => isAdmin || tab !== "admin"),
        [isAdmin],
    );

    const setTab = (tab: SettingsTab) =>
        navigate({
            to: ".",
            search: {
                tab,
            },
        });

    return {
        activeTab,
        visibleTabs,
        setTab,
    };
};
