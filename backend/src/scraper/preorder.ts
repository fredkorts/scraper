import { PreorderDetectionSource } from "@prisma/client";
import type { ParsedProduct } from "./types";

type PreorderClassificationInput = Pick<
    ParsedProduct,
    "name" | "isPreorderCandidate" | "preorderEtaCandidate" | "preorderDetectedFromCandidate"
>;

const PREORDER_MARKER_PATTERNS = [/\beeltellimus(?:ega|e)?\b/i, /\bpre[\s-]?order\b/i, /\bpreorder\b/i];

const PREORDER_CATEGORY_PATTERNS = [/\beeltellimus(?:ed)?\b/i, /\bpre[\s-]?order\b/i];

const ETA_DATE_PATTERNS = [
    /saabumise\s+kuup[aä]ev\s*[:-]\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i,
    /arrival\s+date\s*[:-]\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})/i,
];

const toUtcDate = (dayRaw: string, monthRaw: string, yearRaw: string): Date | null => {
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
        return null;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    const utcDate = new Date(Date.UTC(year, month - 1, day));

    if (utcDate.getUTCFullYear() !== year || utcDate.getUTCMonth() !== month - 1 || utcDate.getUTCDate() !== day) {
        return null;
    }

    return utcDate;
};

const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();

export const extractPreorderEtaDate = (value: string): Date | null => {
    const normalized = normalize(value);

    for (const pattern of ETA_DATE_PATTERNS) {
        const match = normalized.match(pattern);
        if (!match) {
            continue;
        }

        const [, dayRaw, monthRaw, yearRaw] = match;
        if (!dayRaw || !monthRaw || !yearRaw) {
            continue;
        }

        const parsed = toUtcDate(dayRaw, monthRaw, yearRaw);
        if (parsed) {
            return parsed;
        }
    }

    return null;
};

export const hasPreorderMarker = (value: string): boolean => {
    const normalized = normalize(value);
    return PREORDER_MARKER_PATTERNS.some((pattern) => pattern.test(normalized));
};

const categorySuggestsPreorder = (categorySlug: string): boolean =>
    PREORDER_CATEGORY_PATTERNS.some((pattern) => pattern.test(categorySlug));

interface PreorderClassification {
    isPreorder: boolean;
    preorderEta: Date | null;
    preorderDetectedFrom: PreorderDetectionSource | null;
}

export const classifyPreorder = (
    product: PreorderClassificationInput,
    categorySlug: string,
): PreorderClassification => {
    if (product.isPreorderCandidate) {
        return {
            isPreorder: true,
            preorderEta: product.preorderEtaCandidate ?? null,
            preorderDetectedFrom: product.preorderDetectedFromCandidate ?? PreorderDetectionSource.TITLE,
        };
    }

    if (categorySuggestsPreorder(categorySlug)) {
        return {
            isPreorder: true,
            preorderEta: null,
            preorderDetectedFrom: PreorderDetectionSource.CATEGORY_SLUG,
        };
    }

    if (hasPreorderMarker(product.name)) {
        return {
            isPreorder: true,
            preorderEta: extractPreorderEtaDate(product.name),
            preorderDetectedFrom: PreorderDetectionSource.TITLE,
        };
    }

    return {
        isPreorder: false,
        preorderEta: null,
        preorderDetectedFrom: null,
    };
};
