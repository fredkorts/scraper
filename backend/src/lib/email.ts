export const normalizeEmailAddress = (value: string): string => {
    return value.trim().normalize("NFKC").toLowerCase();
};
