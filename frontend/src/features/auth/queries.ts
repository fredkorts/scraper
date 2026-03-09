import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import type { AuthSession, AuthUser } from "@mabrik/shared";
import { apiGet, resetAuthClientState } from "../../lib/api/client";
import { ApiError } from "../../lib/api/errors";
import { authResponseSchema, authSessionListResponseSchema } from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";
import { broadcastAuthEvent } from "./auth-events";

const PROTECTED_QUERY_KEY_ROOTS = new Set([
    "dashboard",
    "runs",
    "changes",
    "settings",
    "notifications",
    "categories",
    "products",
]);

type MeQueryMode = "bootstrap" | "standard";

const isProtectedQuery = (queryKey: readonly unknown[]): boolean => {
    const rootKey = queryKey[0];
    if (typeof rootKey !== "string") {
        return false;
    }

    if (PROTECTED_QUERY_KEY_ROOTS.has(rootKey)) {
        return true;
    }

    return rootKey === "auth" && queryKey[1] === "sessions";
};

const clearProtectedSessionQueries = async (queryClient: QueryClient): Promise<void> => {
    await queryClient.cancelQueries({
        predicate: (query) => isProtectedQuery(query.queryKey),
    });

    queryClient.removeQueries({
        predicate: (query) => isProtectedQuery(query.queryKey),
    });
};

export const meQueryOptions = (mode: MeQueryMode = "standard") =>
    queryOptions<AuthUser | null>({
        queryKey: queryKeys.auth.me(),
        queryFn: async () => {
            try {
                const response = await apiGet("/api/auth/me", authResponseSchema, {
                    authMode: mode,
                });
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

export const ensureSession = async (queryClient: QueryClient): Promise<AuthUser | null> => {
    const previousSession = queryClient.getQueryData<AuthUser | null>(queryKeys.auth.me());
    const session = await queryClient.ensureQueryData(meQueryOptions("bootstrap"));

    if (session !== null) {
        return session;
    }

    queryClient.setQueryData(queryKeys.auth.me(), null);
    await clearProtectedSessionQueries(queryClient);
    resetAuthClientState();

    if (previousSession) {
        broadcastAuthEvent("signed_out");
    }

    return null;
};

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
