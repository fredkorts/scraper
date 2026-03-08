import type {
    ForgotPasswordRequest,
    LoginRequest,
    MfaDisableRequest,
    MfaSetupConfirmRequest,
    MfaVerifyLoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionRevokeOthersRequest,
    SessionRevokeRequest,
    VerifyEmailRequest,
} from "@mabrik/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPost } from "../../lib/api/client";
import {
    authResponseSchema,
    logoutResponseSchema,
    mfaChallengeResponseSchema,
    mfaRecoveryCodesResponseSchema,
    mfaSetupStartResponseSchema,
    successResponseSchema,
} from "../../lib/api/schemas";
import { queryKeys } from "../../lib/query/query-keys";
import { broadcastAuthEvent } from "./auth-events";

type LoginMutationResult =
    | {
          mfaRequired: true;
          challengeToken: string;
          user: ReturnType<typeof authResponseSchema.parse>["user"];
      }
    | ReturnType<typeof authResponseSchema.parse>;

export const useLoginMutation = () => {
    const queryClient = useQueryClient();

    return useMutation<LoginMutationResult, Error, LoginRequest>({
        mutationFn: async (payload: LoginRequest) => {
            const response = await apiPost("/api/auth/login", payload);
            const challengeResult = mfaChallengeResponseSchema.safeParse(response);
            if (challengeResult.success) {
                return challengeResult.data;
            }

            return authResponseSchema.parse(response);
        },
        onSuccess: (result) => {
            if ("mfaRequired" in result && result.mfaRequired) {
                return;
            }

            queryClient.setQueryData(queryKeys.auth.me(), result.user);
        },
    });
};

export const useVerifyMfaLoginMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: MfaVerifyLoginRequest) =>
            apiPost("/api/auth/mfa/verify-login", payload, authResponseSchema),
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
            queryClient.removeQueries();
            broadcastAuthEvent("signed_out");
        },
    });
};

export const useResendEmailVerificationMutation = () =>
    useMutation({
        mutationFn: () => apiPost("/api/auth/email-verification/resend", undefined, successResponseSchema),
    });

export const useVerifyEmailMutation = () =>
    useMutation({
        mutationFn: (payload: VerifyEmailRequest) =>
            apiPost("/api/auth/email-verification/verify", payload, successResponseSchema),
    });

export const useForgotPasswordMutation = () =>
    useMutation({
        mutationFn: (payload: ForgotPasswordRequest) =>
            apiPost("/api/auth/password/forgot", payload, successResponseSchema),
    });

export const useResetPasswordMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: ResetPasswordRequest) =>
            apiPost("/api/auth/password/reset", payload, successResponseSchema),
        onSuccess: () => {
            queryClient.setQueryData(queryKeys.auth.me(), null);
            queryClient.removeQueries();
            broadcastAuthEvent("password_reset");
        },
    });
};

export const useStartMfaSetupMutation = () =>
    useMutation({
        mutationFn: () => apiPost("/api/auth/mfa/setup/start", undefined, mfaSetupStartResponseSchema),
    });

export const useConfirmMfaSetupMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: MfaSetupConfirmRequest) =>
            apiPost("/api/auth/mfa/setup/confirm", payload, mfaRecoveryCodesResponseSchema),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
        },
    });
};

export const useDisableMfaMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: MfaDisableRequest) => apiPost("/api/auth/mfa/disable", payload, successResponseSchema),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
        },
    });
};

export const useRegenerateRecoveryCodesMutation = () =>
    useMutation({
        mutationFn: (payload: MfaDisableRequest) =>
            apiPost("/api/auth/mfa/recovery-codes/regenerate", payload, mfaRecoveryCodesResponseSchema),
    });

export const useRevokeSessionMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: SessionRevokeRequest }) =>
            apiDelete(`/api/auth/sessions/${id}`, payload, successResponseSchema),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
        },
    });
};

export const useRevokeOtherSessionsMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: SessionRevokeOthersRequest) =>
            apiPost("/api/auth/sessions/revoke-others", payload, successResponseSchema),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
            broadcastAuthEvent("session_revoked");
        },
    });
};
