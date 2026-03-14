import type { NextFunction, Request, Response } from "express";
import {
    emailVerificationVerifySchema,
    forgotPasswordSchema,
    loginSchema,
    mfaDisableSchema,
    mfaSetupConfirmSchema,
    mfaVerifyLoginSchema,
    registerSchema,
    resetPasswordSchema,
    sessionRevokeOthersSchema,
    sessionRevokeSchema,
} from "../schemas/auth";
import { updateProfileSchema } from "../schemas/settings";
import {
    beginGoogleOAuth,
    cleanupExpiredAuthTokens,
    completeGoogleOAuth,
    confirmMfaSetup,
    disableMfa,
    getCurrentUser,
    listSessions,
    login,
    logout,
    regenerateRecoveryCodes,
    refreshSession,
    register,
    requestPasswordReset,
    resendEmailVerification,
    resetPassword,
    revokeOtherSessions,
    revokeSession,
    startMfaSetup,
    updateCurrentUser,
    verifyEmail,
    verifyMfaLogin,
} from "../services/auth.service";
import {
    authCookieNames,
    clearAuthCookies,
    clearOAuthChallengeCookie,
    setAuthCookies,
    setCsrfCookie,
    setOAuthChallengeCookie,
} from "../lib/cookies";
import { config } from "../config";

const getSessionContext = (request: Request): { ip?: string; userAgent?: string } => ({
    ip: request.ip || undefined,
    userAgent: request.get("user-agent") || undefined,
});

const setNoStoreHeaders = (res: Response): void => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
};

const setOauthCallbackHeaders = (res: Response): void => {
    setNoStoreHeaders(res);
    res.setHeader("Referrer-Policy", "no-referrer");
};

const getFrontendRedirectUrl = (path: string, params?: URLSearchParams): string => {
    const url = new URL(path, config.FRONTEND_URL);
    if (params) {
        params.forEach((value, key) => {
            url.searchParams.set(key, value);
        });
    }

    return url.toString();
};

const mapOAuthErrorToLoginCode = (error: unknown): string => {
    if (!(error instanceof Error) || !("code" in error)) {
        return "auth_failed";
    }

    const code = String((error as { code?: string }).code ?? "");

    switch (code) {
        case "oauth_account_inactive":
            return "account_inactive";
        case "oauth_account_action_required":
            return "account_action_required";
        case "oauth_admin_not_allowed":
            return "account_restricted";
        case "oauth_mfa_step_up_required":
            return "additional_auth_required";
        default:
            return "auth_failed";
    }
};

export const csrfHandler = (req: Request, res: Response): void => {
    void req;
    const csrfToken = setCsrfCookie(res);
    setNoStoreHeaders(res);
    res.status(200).json({ success: true, csrfToken });
};

export const startGoogleOAuthHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await beginGoogleOAuth(getSessionContext(req));
        setOAuthChallengeCookie(res, result.challengeCookieValue);
        setNoStoreHeaders(res);
        res.redirect(302, result.redirectUrl);
    } catch (error) {
        next(error);
    }
};

export const googleOAuthCallbackHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await completeGoogleOAuth(
            {
                state: typeof req.query.state === "string" ? req.query.state : undefined,
                code: typeof req.query.code === "string" ? req.query.code : undefined,
                challengeCookieValue: req.cookies[authCookieNames.oauthChallenge] as string | undefined,
            },
            getSessionContext(req),
        );

        setAuthCookies(res, result.accessToken, result.refreshToken);
        setCsrfCookie(res);
        clearOAuthChallengeCookie(res);
        setOauthCallbackHeaders(res);
        res.redirect(302, getFrontendRedirectUrl("/app"));
    } catch (error) {
        clearOAuthChallengeCookie(res);
        setOauthCallbackHeaders(res);
        const redirectParams = new URLSearchParams({
            oauthError: mapOAuthErrorToLoginCode(error),
        });
        res.redirect(302, getFrontendRedirectUrl("/login", redirectParams));
    }
};

export const registerHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = registerSchema.parse(req.body);
        const result = await register(input, getSessionContext(req));

        setAuthCookies(res, result.accessToken, result.refreshToken);
        setCsrfCookie(res);
        res.status(201).json({ user: result.user });
    } catch (error) {
        next(error);
    }
};

export const loginHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = loginSchema.parse(req.body);
        const result = await login(input, getSessionContext(req));

        if (!("accessToken" in result) || !("refreshToken" in result)) {
            res.status(200).json(result);
            return;
        }

        setAuthCookies(res, result.accessToken, result.refreshToken);
        setCsrfCookie(res);
        res.status(200).json({ user: result.user });
    } catch (error) {
        next(error);
    }
};

export const verifyMfaLoginHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = mfaVerifyLoginSchema.parse(req.body);
        const result = await verifyMfaLogin(input, getSessionContext(req));

        setAuthCookies(res, result.accessToken, result.refreshToken);
        setCsrfCookie(res);
        res.status(200).json({ user: result.user });
    } catch (error) {
        next(error);
    }
};

export const refreshHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies[authCookieNames.refreshToken] as string | undefined;
        const result = await refreshSession(refreshToken ?? "", getSessionContext(req));

        setAuthCookies(res, result.accessToken, result.refreshToken);
        setCsrfCookie(res);
        res.status(200).json({ user: result.user });
    } catch (error) {
        next(error);
    }
};

export const logoutHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies[authCookieNames.refreshToken] as string | undefined;
        const result = await logout(refreshToken);

        clearAuthCookies(res);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const meHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await getCurrentUser(req.auth!.userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateProfileHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = updateProfileSchema.parse(req.body);
        const result = await updateCurrentUser(req.auth!.userId, input);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const resendEmailVerificationHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const result = await resendEmailVerification(req.auth!.userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const verifyEmailHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = emailVerificationVerifySchema.parse(req.body);
        const result = await verifyEmail(input.token);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const forgotPasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = forgotPasswordSchema.parse(req.body);
        const result = await requestPasswordReset(input.email);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const resetPasswordHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = resetPasswordSchema.parse(req.body);
        const result = await resetPassword(input.token, input.password);
        clearAuthCookies(res);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const startMfaSetupHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await startMfaSetup(req.auth!.userId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const confirmMfaSetupHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = mfaSetupConfirmSchema.parse(req.body);
        const result = await confirmMfaSetup(req.auth!.userId, input);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const disableMfaHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = mfaDisableSchema.parse(req.body);
        const result = await disableMfa(req.auth!.userId, input);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const regenerateRecoveryCodesHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const input = mfaDisableSchema.parse(req.body);
        const result = await regenerateRecoveryCodes(req.auth!.userId, input);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const listSessionsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const currentRefreshToken = req.cookies[authCookieNames.refreshToken] as string | undefined;
        const result = await listSessions(req.auth!.userId, currentRefreshToken);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const revokeSessionHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = sessionRevokeSchema.parse(req.body);
        const result = await revokeSession(req.auth!.userId, String(req.params.id), input);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const revokeOtherSessionsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const input = sessionRevokeOthersSchema.parse(req.body);
        const currentRefreshToken = req.cookies[authCookieNames.refreshToken] as string | undefined;
        const result = await revokeOtherSessions(req.auth!.userId, currentRefreshToken, input);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const cleanupAuthTokensHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await cleanupExpiredAuthTokens();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
