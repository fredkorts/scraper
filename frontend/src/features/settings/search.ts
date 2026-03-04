import { z } from "zod";
import { settingsTabSchema } from "./schemas";
import type { SettingsTab } from "./types/settings-schema.types";

const settingsSearchSchema = z.object({
    tab: settingsTabSchema.optional(),
});

export interface SettingsSearch {
    tab: SettingsTab;
}

export const defaultSettingsSearch: SettingsSearch = {
    tab: "account",
};

export const parseSettingsSearch = (search: unknown): SettingsSearch => {
    const parsed = settingsSearchSchema.parse(search);

    return {
        tab: parsed.tab ?? defaultSettingsSearch.tab,
    };
};
