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
    cleanupExpiredAuthTokens,
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
import { authCookieNames, clearAuthCookies, setAuthCookies, setCsrfCookie } from "../lib/cookies";
import { issueCsrfCookie } from "../middleware/csrf";

const getSessionContext = (request: Request): { ip?: string; userAgent?: string } => ({
    ip: request.ip || undefined,
    userAgent: request.get("user-agent") || undefined,
});

export const csrfHandler = (req: Request, res: Response): void => {
    issueCsrfCookie(req, res);
    res.status(200).json({ success: true });
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
        setCsrfCookie(res);
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
