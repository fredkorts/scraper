type RunStatusValue = "pending" | "running" | "completed" | "failed";
type RunChangeTypeValue = "price_increase" | "price_decrease" | "new_product" | "sold_out" | "back_in_stock";
type PreorderFilterValue = "all" | "only" | "exclude";
type ChangesSortByValue = "changedAt" | "productName" | "categoryName";
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
    productsQuery: undefined as string | undefined,
    changesPage: 1,
    changesPageSize: 10,
    changesQuery: undefined as string | undefined,
    changeType: undefined as RunChangeTypeValue | undefined,
    preorder: "all" as PreorderFilterValue,
};

export const defaultChangesListSearch = {
    page: 1,
    pageSize: 25,
    sortBy: "changedAt" as ChangesSortByValue,
    sortOrder: "desc" as ChangesSortOrderValue,
    changeType: undefined as RunChangeTypeValue | undefined,
    preorder: "all" as PreorderFilterValue,
    categoryId: undefined as string | undefined,
    windowDays: 7 as 1 | 7 | 30,
    query: undefined as string | undefined,
};
