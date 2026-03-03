import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/errors";

export const createAppQueryClient = (): QueryClient =>
    new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                gcTime: 10 * 60 * 1000,
                retry: (failureCount, error) => {
                    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                        return false;
                    }

                    return failureCount < 2;
                },
                refetchOnWindowFocus: false,
            },
            mutations: {
                retry: 0,
            },
        },
    });
