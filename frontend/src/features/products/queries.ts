import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { queryKeys } from "../../lib/query/query-keys";
import {
    productDetailResponseSchema,
    productQuickSearchResponseSchema,
    productHistoryResponseSchema,
    type ProductDetailData,
    type ProductQuickSearchData,
    type ProductHistoryData,
} from "./schemas";

interface ProductQuickSearchParams {
    query: string;
    limit?: number;
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

export const productDetailQueryOptions = (productId: string) =>
    queryOptions<ProductDetailData>({
        queryKey: queryKeys.products.detail(productId),
        queryFn: () => apiGet(apiEndpoints.products.detail(productId), productDetailResponseSchema),
    });

export const productHistoryQueryOptions = (productId: string) =>
    queryOptions<ProductHistoryData>({
        queryKey: queryKeys.products.history(productId),
        queryFn: () => apiGet(apiEndpoints.products.history(productId), productHistoryResponseSchema),
    });

export const productQuickSearchQueryOptions = ({ query, limit = 8 }: ProductQuickSearchParams) =>
    queryOptions<ProductQuickSearchData>({
        queryKey: queryKeys.products.search({ query, limit }),
        queryFn: ({ signal }) =>
            apiGet(
                `${apiEndpoints.products.search}${toQueryString({
                    query,
                    limit,
                })}`,
                productQuickSearchResponseSchema,
                { signal },
            ),
        enabled: query.trim().length >= 2,
    });

export const useProductDetailQuery = (productId: string) => useQuery(productDetailQueryOptions(productId));
export const useProductHistoryQuery = (productId: string) => useQuery(productHistoryQueryOptions(productId));
export const useProductQuickSearchQuery = (params: ProductQuickSearchParams) =>
    useQuery(productQuickSearchQueryOptions(params));
