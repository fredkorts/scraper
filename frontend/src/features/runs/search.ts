import { z } from "zod";
import {
    defaultDashboardHomeSearch,
    defaultRunDetailSectionSearch,
    defaultRunsListSearch,
} from "../../shared/navigation/default-searches";

export const runsSortByValues = ["startedAt", "status", "totalChanges", "totalProducts", "durationMs"] as const;
export const runsSortOrderValues = ["asc", "desc"] as const;
export const runStatusValues = ["pending", "running", "completed", "failed"] as const;
export const runChangeTypeValues = [
    "price_increase",
    "price_decrease",
    "new_product",
    "sold_out",
    "back_in_stock",
] as const;

const toOptionalString = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const toPositiveInt = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value);

        if (Number.isInteger(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return fallback;
};

const toBooleanString = (value: unknown): "true" | "false" | undefined => {
    if (value === "true" || value === "false") {
        return value;
    }

    return undefined;
};

export { defaultDashboardHomeSearch, defaultRunDetailSectionSearch, defaultRunsListSearch };

export const parseDashboardHomeSearch = (
    search: Record<string, unknown>,
): {
    categoryId?: string;
} => {
    const categoryId = toOptionalString(search.categoryId);

    return {
        categoryId: categoryId && z.string().uuid().safeParse(categoryId).success ? categoryId : undefined,
    };
};

export const parseRunsListSearch = (
    search: Record<string, unknown>,
): {
    page: number;
    pageSize: number;
    sortBy: (typeof runsSortByValues)[number];
    sortOrder: (typeof runsSortOrderValues)[number];
    status?: (typeof runStatusValues)[number];
    categoryId?: string;
} => {
    const status = toOptionalString(search.status);
    const sortBy = toOptionalString(search.sortBy);
    const sortOrder = toOptionalString(search.sortOrder);
    const categoryId = toOptionalString(search.categoryId);

    return {
        page: toPositiveInt(search.page, defaultRunsListSearch.page),
        pageSize: Math.min(toPositiveInt(search.pageSize, defaultRunsListSearch.pageSize), 100),
        sortBy: runsSortByValues.includes(sortBy as (typeof runsSortByValues)[number])
            ? (sortBy as (typeof runsSortByValues)[number])
            : defaultRunsListSearch.sortBy,
        sortOrder: runsSortOrderValues.includes(sortOrder as (typeof runsSortOrderValues)[number])
            ? (sortOrder as (typeof runsSortOrderValues)[number])
            : defaultRunsListSearch.sortOrder,
        status: runStatusValues.includes(status as (typeof runStatusValues)[number])
            ? (status as (typeof runStatusValues)[number])
            : undefined,
        categoryId: categoryId && z.string().uuid().safeParse(categoryId).success ? categoryId : undefined,
    };
};

export const parseRunDetailSearch = (
    search: Record<string, unknown>,
): {
    productsPage: number;
    productsPageSize: number;
    productsInStock?: "true" | "false";
    changesPage: number;
    changesPageSize: number;
    changeType?: (typeof runChangeTypeValues)[number];
} => {
    const changeType = toOptionalString(search.changeType);

    return {
        productsPage: toPositiveInt(search.productsPage, defaultRunDetailSectionSearch.productsPage),
        productsPageSize: Math.min(
            toPositiveInt(search.productsPageSize, defaultRunDetailSectionSearch.productsPageSize),
            100,
        ),
        productsInStock: toBooleanString(search.productsInStock),
        changesPage: toPositiveInt(search.changesPage, defaultRunDetailSectionSearch.changesPage),
        changesPageSize: Math.min(
            toPositiveInt(search.changesPageSize, defaultRunDetailSectionSearch.changesPageSize),
            100,
        ),
        changeType: runChangeTypeValues.includes(changeType as (typeof runChangeTypeValues)[number])
            ? (changeType as (typeof runChangeTypeValues)[number])
            : undefined,
    };
};
