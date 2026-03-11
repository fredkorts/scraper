export const TABLE_SEARCH_QUERY_MAX_LENGTH = 100;

export const normalizeTableSearchQuery = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim().replace(/\s+/g, " ").slice(0, TABLE_SEARCH_QUERY_MAX_LENGTH);
    return normalized.length > 0 ? normalized : undefined;
};

export const tokenizeTableSearchQuery = (query?: string): string[] => {
    if (!query) {
        return [];
    }

    return query.split(" ").filter((token) => token.length > 0);
};
