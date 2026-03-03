import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@mabrik/shared";
import { apiGet } from "../../lib/api/client";
import { ApiError } from "../../lib/api/errors";
import { authResponseSchema } from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";

export const meQueryOptions = () =>
    queryOptions<AuthUser | null>({
        queryKey: queryKeys.auth.me(),
        queryFn: async () => {
            try {
                const response = await apiGet("/api/auth/me", authResponseSchema);
                return response.user;
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) {
                    return null;
                }

                throw error;
            }
        },
        staleTime: 60_000,
    });

export const ensureSession = (queryClient: QueryClient): Promise<AuthUser | null> =>
    queryClient.ensureQueryData(meQueryOptions());

export const useMeQuery = () => useQuery(meQueryOptions());
