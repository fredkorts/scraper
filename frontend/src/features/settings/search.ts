import { z } from "zod";
import { settingsTabSchema } from "./schemas";
import type { SettingsTab } from "./types/settings-schema.types";

const settingsSearchSchema = z.object({
    tab: z.string().optional(),
});

export interface SettingsSearch {
    tab: SettingsTab;
}

export const defaultSettingsSearch: SettingsSearch = {
    tab: "account",
};

export const parseSettingsSearch = (search: unknown): SettingsSearch => {
    const parsed = settingsSearchSchema.safeParse(search);
    if (!parsed.success) {
        return defaultSettingsSearch;
    }

    const requestedTab = parsed.data.tab;
    const normalizedTab = requestedTab === "tracking" ? defaultSettingsSearch.tab : requestedTab;
    const resolvedTab = settingsTabSchema.safeParse(normalizedTab);

    return {
        tab: resolvedTab.success ? resolvedTab.data : defaultSettingsSearch.tab,
    };
};
