import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { queryKeys } from "../../lib/query/query-keys";
import { categoriesResponseSchema, type CategoriesData } from "./schemas";

const toQueryString = (scope?: "tracked" | "all") => {
    if (!scope || scope === "tracked") {
        return "";
    }

    return `?scope=${scope}`;
};

export const categoriesQueryOptions = (scope: "tracked" | "all" = "tracked") =>
    queryOptions<CategoriesData>({
        queryKey: queryKeys.categories.list(scope),
        queryFn: () => apiGet(`${apiEndpoints.categories.list}${toQueryString(scope)}`, categoriesResponseSchema),
    });

export const useCategoriesQuery = (scope: "tracked" | "all" = "tracked") => useQuery(categoriesQueryOptions(scope));
