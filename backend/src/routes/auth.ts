import { Router } from "express";
import {
    cleanupAuthTokensHandler,
    confirmMfaSetupHandler,
    csrfHandler,
    disableMfaHandler,
    forgotPasswordHandler,
    googleOAuthCallbackHandler,
    loginHandler,
    listSessionsHandler,
    logoutHandler,
    meHandler,
    regenerateRecoveryCodesHandler,
    resendEmailVerificationHandler,
    refreshHandler,
    registerHandler,
    resetPasswordHandler,
    startGoogleOAuthHandler,
    revokeOtherSessionsHandler,
    revokeSessionHandler,
    startMfaSetupHandler,
    verifyEmailHandler,
    verifyMfaLoginHandler,
} from "../controllers/auth.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { updateProfileHandler } from "../controllers/auth.controller";
import { requireCsrf, requireTrustedOrigin } from "../middleware/csrf";
import { authMutationLimiter, authenticatedMutationLimiter, highCostReadLimiter } from "../middleware/rate-limit";

const authRouter = Router();

authRouter.get("/csrf", csrfHandler);
authRouter.get("/oauth/google/start", authMutationLimiter, startGoogleOAuthHandler);
authRouter.get("/oauth/google/callback", authMutationLimiter, googleOAuthCallbackHandler);
authRouter.post("/register", authMutationLimiter, requireTrustedOrigin, registerHandler);
authRouter.post("/login", authMutationLimiter, requireTrustedOrigin, loginHandler);
authRouter.post("/mfa/verify-login", authMutationLimiter, requireTrustedOrigin, verifyMfaLoginHandler);
authRouter.post("/refresh", authMutationLimiter, requireTrustedOrigin, requireCsrf, refreshHandler);
authRouter.post("/logout", authMutationLimiter, requireTrustedOrigin, requireCsrf, logoutHandler);
authRouter.post("/password/forgot", authMutationLimiter, requireTrustedOrigin, forgotPasswordHandler);
authRouter.post("/password/reset", authMutationLimiter, requireTrustedOrigin, resetPasswordHandler);
authRouter.post("/email-verification/verify", authMutationLimiter, requireTrustedOrigin, verifyEmailHandler);

authRouter.get("/me", requireAuth, meHandler);
authRouter.patch(
    "/me",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    updateProfileHandler,
);
authRouter.post(
    "/email-verification/resend",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    resendEmailVerificationHandler,
);
authRouter.post(
    "/mfa/setup/start",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    startMfaSetupHandler,
);
authRouter.post(
    "/mfa/setup/confirm",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    confirmMfaSetupHandler,
);
authRouter.post(
    "/mfa/disable",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    disableMfaHandler,
);
authRouter.post(
    "/mfa/recovery-codes/regenerate",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    regenerateRecoveryCodesHandler,
);
authRouter.get("/sessions", requireAuth, highCostReadLimiter, listSessionsHandler);
authRouter.delete(
    "/sessions/:id",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    revokeSessionHandler,
);
authRouter.post(
    "/sessions/revoke-others",
    requireAuth,
    authenticatedMutationLimiter,
    requireTrustedOrigin,
    requireCsrf,
    revokeOtherSessionsHandler,
);
authRouter.post(
    "/maintenance/cleanup-auth-tokens",
    requireAuth,
    requireAdmin,
    highCostReadLimiter,
    cleanupAuthTokensHandler,
);

export { authRouter };
