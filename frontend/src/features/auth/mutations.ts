import type { LoginRequest, RegisterRequest } from "@mabrik/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../lib/api/client";
import { authResponseSchema, logoutResponseSchema } from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";

export const useLoginMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: LoginRequest) => apiPost("/api/auth/login", payload, authResponseSchema),
        onSuccess: (result) => {
            queryClient.setQueryData(queryKeys.auth.me(), result.user);
        },
    });
};

export const useRegisterMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: RegisterRequest) => apiPost("/api/auth/register", payload, authResponseSchema),
        onSuccess: (result) => {
            queryClient.setQueryData(queryKeys.auth.me(), result.user);
        },
    });
};

export const useLogoutMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiPost("/api/auth/logout", undefined, logoutResponseSchema),
        onSuccess: () => {
            queryClient.setQueryData(queryKeys.auth.me(), null);
        },
    });
};
