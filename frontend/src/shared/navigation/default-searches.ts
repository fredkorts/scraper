type RunStatusValue = "pending" | "running" | "completed" | "failed";
type RunChangeTypeValue =
    | "price_increase"
    | "price_decrease"
    | "new_product"
    | "sold_out"
    | "back_in_stock";

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
