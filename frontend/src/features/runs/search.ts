import { z } from "zod";
import {
    defaultChangesListSearch,
    defaultDashboardHomeSearch,
    defaultRunDetailSectionSearch,
    defaultRunsListSearch,
} from "../../shared/navigation/default-searches";
import { normalizeTableSearchQuery } from "../../shared/search/query";
import { normalizePreorderFilterValue, preorderFilterValues } from "./hooks/use-preorder-filter";

export const runsSortByValues = ["startedAt", "status", "totalChanges", "totalProducts", "durationMs"] as const;
export const runsSortOrderValues = ["asc", "desc"] as const;
export const changesSortByValues = ["changedAt", "productName", "categoryName"] as const;
export const changesSortOrderValues = ["asc", "desc"] as const;
export const runStatusValues = ["pending", "running", "completed", "failed"] as const;
export const runChangeTypeValues = [
    "price_increase",
    "price_decrease",
    "new_product",
    "sold_out",
    "back_in_stock",
] as const;
export const preorderFilterSearchValues = preorderFilterValues;
export const changesWindowValues = [1, 7, 30] as const;

const toOptionalString = (value: unknown): string | undefined => normalizeTableSearchQuery(value);

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

export { defaultChangesListSearch, defaultDashboardHomeSearch, defaultRunDetailSectionSearch, defaultRunsListSearch };
export { normalizeTableSearchQuery };

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
    productsQuery?: string;
    changesPage: number;
    changesPageSize: number;
    changesQuery?: string;
    changeType?: (typeof runChangeTypeValues)[number];
    preorder: (typeof preorderFilterSearchValues)[number];
} => {
    const changeType = toOptionalString(search.changeType);

    return {
        productsPage: toPositiveInt(search.productsPage, defaultRunDetailSectionSearch.productsPage),
        productsPageSize: Math.min(
            toPositiveInt(search.productsPageSize, defaultRunDetailSectionSearch.productsPageSize),
            100,
        ),
        productsInStock: toBooleanString(search.productsInStock),
        productsQuery: normalizeTableSearchQuery(search.productsQuery),
        changesPage: toPositiveInt(search.changesPage, defaultRunDetailSectionSearch.changesPage),
        changesPageSize: Math.min(
            toPositiveInt(search.changesPageSize, defaultRunDetailSectionSearch.changesPageSize),
            100,
        ),
        changesQuery: normalizeTableSearchQuery(search.changesQuery),
        changeType: runChangeTypeValues.includes(changeType as (typeof runChangeTypeValues)[number])
            ? (changeType as (typeof runChangeTypeValues)[number])
            : undefined,
        preorder: normalizePreorderFilterValue(search.preorder, defaultRunDetailSectionSearch.preorder),
    };
};

export const parseChangesListSearch = (
    search: Record<string, unknown>,
): {
    page: number;
    pageSize: number;
    sortBy: (typeof changesSortByValues)[number];
    sortOrder: (typeof changesSortOrderValues)[number];
    changeType?: (typeof runChangeTypeValues)[number];
    preorder: (typeof preorderFilterSearchValues)[number];
    categoryId?: string;
    windowDays: (typeof changesWindowValues)[number];
    query?: string;
} => {
    const sortBy = toOptionalString(search.sortBy);
    const sortOrder = toOptionalString(search.sortOrder);
    const changeType = toOptionalString(search.changeType);
    const categoryId = toOptionalString(search.categoryId);
    const parsedWindowDays =
        typeof search.windowDays === "number"
            ? search.windowDays
            : typeof search.windowDays === "string"
              ? Number(search.windowDays)
              : defaultChangesListSearch.windowDays;
    const windowDays = changesWindowValues.includes(parsedWindowDays as (typeof changesWindowValues)[number])
        ? (parsedWindowDays as (typeof changesWindowValues)[number])
        : defaultChangesListSearch.windowDays;

    return {
        page: toPositiveInt(search.page, defaultChangesListSearch.page),
        pageSize: Math.min(toPositiveInt(search.pageSize, defaultChangesListSearch.pageSize), 100),
        sortBy: changesSortByValues.includes(sortBy as (typeof changesSortByValues)[number])
            ? (sortBy as (typeof changesSortByValues)[number])
            : defaultChangesListSearch.sortBy,
        sortOrder: changesSortOrderValues.includes(sortOrder as (typeof changesSortOrderValues)[number])
            ? (sortOrder as (typeof changesSortOrderValues)[number])
            : defaultChangesListSearch.sortOrder,
        changeType: runChangeTypeValues.includes(changeType as (typeof runChangeTypeValues)[number])
            ? (changeType as (typeof runChangeTypeValues)[number])
            : undefined,
        preorder: normalizePreorderFilterValue(search.preorder, defaultChangesListSearch.preorder),
        categoryId: categoryId && z.string().uuid().safeParse(categoryId).success ? categoryId : undefined,
        windowDays,
        query: normalizeTableSearchQuery(search.query),
    };
};
