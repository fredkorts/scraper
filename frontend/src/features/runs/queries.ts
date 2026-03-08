import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { queryKeys } from "../../lib/query/query-keys";
import {
    changesListResponseSchema,
    dashboardHomeResponseSchema,
    runChangesResponseSchema,
    runDetailResponseSchema,
    runProductsResponseSchema,
    runsListResponseSchema,
    type ChangesListData,
    type DashboardHomeData,
    type RunChangesData,
    type RunDetailData,
    type RunProductsData,
    type RunsListData,
} from "./schemas";

interface RunsListParams {
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: string;
    status?: string;
    categoryId?: string;
}

interface DashboardHomeParams {
    categoryId?: string;
}

interface RunProductsParams {
    page: number;
    pageSize: number;
    inStock?: "true" | "false";
}

interface RunChangesParams {
    page: number;
    pageSize: number;
    changeType?: string;
}

interface ChangesListParams {
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: string;
    changeType?: string;
    categoryId?: string;
    windowDays: number;
}

const toQueryString = (params: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            searchParams.set(key, String(value));
        }
    }

    const queryString = searchParams.toString();
    return queryString.length > 0 ? `?${queryString}` : "";
};

export const dashboardHomeQueryOptions = (params: DashboardHomeParams = {}) =>
    queryOptions<DashboardHomeData>({
        queryKey: queryKeys.dashboard.filteredHome({ ...params }),
        queryFn: () =>
            apiGet(
                `${apiEndpoints.dashboard.home}${toQueryString({
                    categoryId: params.categoryId,
                })}`,
                dashboardHomeResponseSchema,
            ),
    });

export const runsListQueryOptions = (params: RunsListParams) =>
    queryOptions<RunsListData>({
        queryKey: queryKeys.runs.list({ ...params }),
        queryFn: () =>
            apiGet(
                `${apiEndpoints.runs.list}${toQueryString({
                    page: params.page,
                    pageSize: params.pageSize,
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder,
                    status: params.status,
                    categoryId: params.categoryId,
                })}`,
                runsListResponseSchema,
            ),
        placeholderData: keepPreviousData,
    });

export const runDetailQueryOptions = (runId: string) =>
    queryOptions<RunDetailData>({
        queryKey: queryKeys.runs.detail(runId),
        queryFn: () => apiGet(apiEndpoints.runs.detail(runId), runDetailResponseSchema),
    });

export const runProductsQueryOptions = (runId: string, params: RunProductsParams) =>
    queryOptions<RunProductsData>({
        queryKey: queryKeys.runs.products(runId, { ...params }),
        queryFn: () =>
            apiGet(
                `${apiEndpoints.runs.products(runId)}${toQueryString({
                    page: params.page,
                    pageSize: params.pageSize,
                    inStock: params.inStock,
                })}`,
                runProductsResponseSchema,
            ),
        placeholderData: keepPreviousData,
    });

export const runChangesQueryOptions = (runId: string, params: RunChangesParams) =>
    queryOptions<RunChangesData>({
        queryKey: queryKeys.runs.changes(runId, { ...params }),
        queryFn: () =>
            apiGet(
                `${apiEndpoints.runs.changes(runId)}${toQueryString({
                    page: params.page,
                    pageSize: params.pageSize,
                    changeType: params.changeType,
                })}`,
                runChangesResponseSchema,
            ),
        placeholderData: keepPreviousData,
    });

export const changesListQueryOptions = (params: ChangesListParams) =>
    queryOptions<ChangesListData>({
        queryKey: queryKeys.changes.list({ ...params }),
        queryFn: () =>
            apiGet(
                `${apiEndpoints.changes.list}${toQueryString({
                    page: params.page,
                    pageSize: params.pageSize,
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder,
                    changeType: params.changeType,
                    categoryId: params.categoryId,
                    windowDays: params.windowDays,
                })}`,
                changesListResponseSchema,
            ),
        placeholderData: keepPreviousData,
    });

export const useDashboardHomeQuery = (params: DashboardHomeParams = {}) => useQuery(dashboardHomeQueryOptions(params));
export const useRunsListQuery = (params: RunsListParams) => useQuery(runsListQueryOptions(params));
export const useRunDetailQuery = (runId: string) => useQuery(runDetailQueryOptions(runId));
export const useRunProductsQuery = (runId: string, params: RunProductsParams) =>
    useQuery(runProductsQueryOptions(runId, params));
export const useRunChangesQuery = (runId: string, params: RunChangesParams) =>
    useQuery(runChangesQueryOptions(runId, params));
export const useChangesListQuery = (params: ChangesListParams) => useQuery(changesListQueryOptions(params));
