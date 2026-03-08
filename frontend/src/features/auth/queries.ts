import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import type { AuthSession, AuthUser } from "@mabrik/shared";
import { apiGet } from "../../lib/api/client";
import { ApiError } from "../../lib/api/errors";
import { authResponseSchema, authSessionListResponseSchema } from "../../lib/api/schemas";
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

export const sessionsQueryOptions = () =>
    queryOptions<AuthSession[]>({
        queryKey: queryKeys.auth.sessions(),
        queryFn: async () => {
            const response = await apiGet("/api/auth/sessions", authSessionListResponseSchema);
            return response.sessions;
        },
        staleTime: 30_000,
    });

export const useSessionsQuery = () => useQuery(sessionsQueryOptions());
