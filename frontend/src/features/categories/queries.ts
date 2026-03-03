import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { queryKeys } from "../../lib/query/query-keys";
import { categoriesResponseSchema, type CategoriesData } from "./schemas";

export const categoriesQueryOptions = () =>
    queryOptions<CategoriesData>({
        queryKey: queryKeys.categories.list(),
        queryFn: () => apiGet(apiEndpoints.categories.list, categoriesResponseSchema),
    });

export const useCategoriesQuery = () => useQuery(categoriesQueryOptions());
