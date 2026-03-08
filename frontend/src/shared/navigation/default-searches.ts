type RunStatusValue = "pending" | "running" | "completed" | "failed";
type RunChangeTypeValue = "price_increase" | "price_decrease" | "new_product" | "sold_out" | "back_in_stock";
type ChangesSortByValue = "changedAt" | "changeType" | "productName" | "categoryName";
type ChangesSortOrderValue = "asc" | "desc";

export const defaultRunsListSearch = {
    page: 1,
    pageSize: 25,
    sortBy: "startedAt" as const,
    sortOrder: "desc" as const,
    status: undefined as RunStatusValue | undefined,
    categoryId: undefined as string | undefined,
};

export const defaultDashboardHomeSearch = {
    categoryId: undefined as string | undefined,
};

export const defaultRunDetailSectionSearch = {
    productsPage: 1,
    productsPageSize: 10,
    productsInStock: undefined as "true" | "false" | undefined,
    changesPage: 1,
    changesPageSize: 10,
    changeType: undefined as RunChangeTypeValue | undefined,
};

export const defaultChangesListSearch = {
    page: 1,
    pageSize: 25,
    sortBy: "changedAt" as ChangesSortByValue,
    sortOrder: "desc" as ChangesSortOrderValue,
    changeType: undefined as RunChangeTypeValue | undefined,
    categoryId: undefined as string | undefined,
    windowDays: 7 as 1 | 7 | 30,
};
