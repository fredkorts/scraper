export const preorderFilterValues = ["all", "only", "exclude"] as const;

export type PreorderFilterValue = (typeof preorderFilterValues)[number];

export const normalizePreorderFilterValue = (
    value: unknown,
    fallback: PreorderFilterValue = "all",
): PreorderFilterValue => {
    if (typeof value !== "string") {
        return fallback;
    }

    return preorderFilterValues.includes(value as PreorderFilterValue) ? (value as PreorderFilterValue) : fallback;
};
