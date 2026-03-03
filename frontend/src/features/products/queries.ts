import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api/client";
import { apiEndpoints } from "../../lib/api/endpoints";
import { queryKeys } from "../../lib/query/query-keys";
import {
    productDetailResponseSchema,
    productHistoryResponseSchema,
    type ProductDetailData,
    type ProductHistoryData,
} from "./schemas";

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

export const useProductDetailQuery = (productId: string) => useQuery(productDetailQueryOptions(productId));
export const useProductHistoryQuery = (productId: string) => useQuery(productHistoryQueryOptions(productId));
