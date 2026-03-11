import bcrypt from "bcrypt";
import {
    Prisma,
    UserRole as PrismaUserRole,
    type NotificationChannelType,
    type RefreshToken,
    type User,
} from "@prisma/client";
import type {
    AuthResponse,
    AuthSession,
    AuthSessionListResponse,
    AuthUser,
    LoginRequest,
    LogoutResponse,
    MfaDisableRequest,
    MfaRecoveryCodesResponse,
    MfaSetupConfirmRequest,
    MfaSetupStartResponse,
    MfaVerifyLoginRequest,
    RegisterRequest,
    SessionRevokeOthersRequest,
    SessionRevokeRequest,
    UserRole,
} from "@mabrik/shared";
import { config } from "../config";
import { AppError } from "../lib/errors";
import { generateOneTimeToken, generateRefreshToken, hashToken } from "../lib/hash";
import { signAccessToken } from "../lib/jwt";
import {
    decryptMfaSecret,
    encryptMfaSecret,
    generateRecoveryCodes,
    generateTotpSecret,
    normalizeRecoveryCode,
    verifyTotpCode,
} from "../lib/mfa";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { sendPasswordResetEmail, sendSecurityEventEmail, sendVerificationEmail } from "./auth-email.service";

interface SessionContext {
    ip?: string;
    userAgent?: string;
}

interface SessionTokens {
    accessToken: string;
    refreshToken: string;
}

interface AuthResult extends AuthResponse, SessionTokens {}

type MfaLoginChallengeResult = {
    mfaRequired: true;
    challengeToken: string;
    user: AuthUser;
};

type LoginResult = AuthResult | MfaLoginChallengeResult;

const roleMap: Record<PrismaUserRole, UserRole> = {
    FREE: "free",
    PAID: "paid",
    ADMIN: "admin",
};

const sanitizeUser = (user: User): AuthUser => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: roleMap[user.role],
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
    mfaEnabled: user.mfaEnabled,
    mfaEnabledAt: user.mfaEnabledAt?.toISOString(),
    capabilities: {
        productWatchlist: config.PRODUCT_WATCHLIST_ENABLED,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
});

const getRefreshExpiry = (): Date => new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

const getEmailVerificationExpiry = (): Date =>
    new Date(Date.now() + config.AUTH_EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

const getPasswordResetExpiry = (): Date => new Date(Date.now() + config.AUTH_PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

const getMfaChallengeExpiry = (): Date => new Date(Date.now() + config.AUTH_MFA_CHALLENGE_TTL_MINUTES * 60 * 1000);

const issueSession = async (
    tx: Prisma.TransactionClient,
    user: User,
    context: SessionContext,
): Promise<{ accessToken: string; refreshToken: string; refreshTokenId: string }> => {
    const refreshToken = generateRefreshToken();
    const refreshTokenRecord = await tx.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: hashToken(refreshToken),
            expiresAt: getRefreshExpiry(),
            lastUsedAt: new Date(),
            createdByIp: context.ip,
            createdByUserAgent: context.userAgent,
        },
    });

    const accessToken = signAccessToken({
        sub: user.id,
        email: user.email,
        role: roleMap[user.role],
    });

    return {
        accessToken,
        refreshToken,
        refreshTokenId: refreshTokenRecord.id,
    };
};

const invalidateAllActiveUserSessions = async (
    tx: Prisma.TransactionClient,
    userId: string,
    reason: string,
): Promise<void> => {
    await tx.refreshToken.updateMany({
        where: {
            userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
            revocationReason: reason,
        },
    });
};

const createEmailVerificationToken = async (tx: Prisma.TransactionClient, userId: string): Promise<string> => {
    const rawToken = generateOneTimeToken();
    const tokenHash = hashToken(rawToken);

    await tx.emailVerificationToken.updateMany({
        where: {
            userId,
            usedAt: null,
        },
        data: {
            usedAt: new Date(),
        },
    });

    await tx.emailVerificationToken.create({
        data: {
            userId,
            tokenHash,
            expiresAt: getEmailVerificationExpiry(),
        },
    });

    return rawToken;
};

const createPasswordResetToken = async (tx: Prisma.TransactionClient, userId: string): Promise<string> => {
    const rawToken = generateOneTimeToken();
    const tokenHash = hashToken(rawToken);

    await tx.passwordResetToken.updateMany({
        where: {
            userId,
            usedAt: null,
        },
        data: {
            usedAt: new Date(),
        },
    });

    await tx.passwordResetToken.create({
        data: {
            userId,
            tokenHash,
            expiresAt: getPasswordResetExpiry(),
        },
    });

    return rawToken;
};

const verifyStepUp = async (
    user: User,
    options: { currentPassword?: string; mfaCode?: string; recoveryCode?: string },
): Promise<void> => {
    if (options.currentPassword) {
        const ok = await bcrypt.compare(options.currentPassword, user.passwordHash);
        if (!ok) {
            throw new AppError(403, "forbidden", "Step-up authentication failed");
        }
        return;
    }

    if (!user.mfaEnabled || !config.AUTH_ENABLE_MFA) {
        throw new AppError(403, "forbidden", "Step-up authentication failed");
    }

    const mfaResult = await verifyUserMfaCode(user, options.mfaCode, options.recoveryCode);
    if (!mfaResult.ok) {
        throw new AppError(403, "forbidden", "Step-up authentication failed");
    }
};

const verifyUserMfaCode = async (
    user: User,
    mfaCode?: string,
    recoveryCode?: string,
): Promise<{ ok: boolean; usedRecoveryCode: boolean }> => {
    if (!user.mfaEnabled || !user.mfaSecretEncrypted || !config.AUTH_ENABLE_MFA) {
        return { ok: false, usedRecoveryCode: false };
    }

    if (mfaCode) {
        try {
            const secret = decryptMfaSecret(user.mfaSecretEncrypted);
            if (verifyTotpCode(secret, mfaCode)) {
                return { ok: true, usedRecoveryCode: false };
            }
        } catch (error) {
            logger.warn("mfa_secret_decrypt_failed", { userId: user.id, error });
        }
    }

    if (recoveryCode) {
        const normalized = normalizeRecoveryCode(recoveryCode);
        const hashed = hashToken(normalized);
        const code = await prisma.mfaRecoveryCode.findFirst({
            where: {
                userId: user.id,
                codeHash: hashed,
                usedAt: null,
            },
        });

        if (!code) {
            return { ok: false, usedRecoveryCode: false };
        }

        await prisma.mfaRecoveryCode.update({
            where: { id: code.id },
            data: {
                usedAt: new Date(),
            },
        });

        void sendSecurityEventEmail(
            user.email,
            "Recovery code used",
            "A recovery code was used to complete authentication on your account.",
        );
        return { ok: true, usedRecoveryCode: true };
    }

    return { ok: false, usedRecoveryCode: false };
};

export const register = async (input: RegisterRequest, context: SessionContext): Promise<AuthResult> => {
    try {
        const transactionResult = await prisma.$transaction(async (tx) => {
            const existingUser = await tx.user.findUnique({
                where: { email: input.email },
            });

            if (existingUser) {
                throw new AppError(409, "conflict", "An account with that email already exists");
            }

            const passwordHash = await bcrypt.hash(input.password, config.BCRYPT_ROUNDS);
            const user = await tx.user.create({
                data: {
                    email: input.email,
                    passwordHash,
                    name: input.name,
                },
            });

            await tx.notificationChannel.create({
                data: {
                    userId: user.id,
                    channelType: "EMAIL" satisfies NotificationChannelType,
                    destination: user.email,
                    isDefault: true,
                    isActive: true,
                },
            });

            const verificationToken = await createEmailVerificationToken(tx, user.id);
            const session = await issueSession(tx, user, context);

            return {
                user,
                verificationToken,
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
            };
        });

        void sendVerificationEmail(transactionResult.user.email, transactionResult.verificationToken);

        return {
            user: sanitizeUser(transactionResult.user),
            accessToken: transactionResult.accessToken,
            refreshToken: transactionResult.refreshToken,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError(409, "conflict", "Failed to register user");
        }

        throw error;
    }
};

export const login = async (input: LoginRequest, context: SessionContext): Promise<LoginResult> => {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
    });

    if (!user) {
        throw new AppError(401, "unauthorized", "Invalid email or password");
    }

    if (!user.isActive) {
        throw new AppError(403, "forbidden", "This account is inactive");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
        throw new AppError(401, "unauthorized", "Invalid email or password");
    }

    if (config.AUTH_ENABLE_MFA && user.mfaEnabled) {
        const challengeToken = generateOneTimeToken();

        await prisma.mfaLoginChallenge.create({
            data: {
                userId: user.id,
                challengeTokenHash: hashToken(challengeToken),
                expiresAt: getMfaChallengeExpiry(),
            },
        });

        return {
            mfaRequired: true,
            challengeToken,
            user: sanitizeUser(user),
        };
    }

    const session = await prisma.$transaction((tx) => issueSession(tx, user, context));

    void sendSecurityEventEmail(
        user.email,
        "New login",
        `A new login was detected from IP ${context.ip ?? "unknown"}.`,
    );

    return {
        user: sanitizeUser(user),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
    };
};

export const verifyMfaLogin = async (input: MfaVerifyLoginRequest, context: SessionContext): Promise<AuthResult> => {
    const challenge = await prisma.mfaLoginChallenge.findUnique({
        where: {
            challengeTokenHash: hashToken(input.challengeToken),
        },
        include: {
            user: true,
        },
    });

    if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) {
        throw new AppError(401, "unauthorized", "MFA challenge is invalid");
    }

    if (!challenge.user.isActive) {
        throw new AppError(403, "forbidden", "This account is inactive");
    }

    const mfaResult = await verifyUserMfaCode(challenge.user, input.code, input.recoveryCode);
    if (!mfaResult.ok) {
        throw new AppError(401, "unauthorized", "Invalid MFA code");
    }

    const session = await prisma.$transaction(async (tx) => {
        await tx.mfaLoginChallenge.update({
            where: { id: challenge.id },
            data: { usedAt: new Date() },
        });
        return issueSession(tx, challenge.user, context);
    });

    if (mfaResult.usedRecoveryCode) {
        void sendSecurityEventEmail(
            challenge.user.email,
            "MFA recovery code used",
            "A recovery code was used during login.",
        );
    }

    void sendSecurityEventEmail(
        challenge.user.email,
        "New login",
        `A new login was detected from IP ${context.ip ?? "unknown"}.`,
    );

    return {
        user: sanitizeUser(challenge.user),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
    };
};

export const refreshSession = async (refreshToken: string, context: SessionContext): Promise<AuthResult> => {
    const tokenHash = hashToken(refreshToken);
    const existingToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });

    if (!existingToken) {
        throw new AppError(401, "unauthorized", "Invalid refresh token");
    }

    if (existingToken.revokedAt) {
        await prisma.refreshToken.updateMany({
            where: {
                userId: existingToken.userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
                revocationReason: "reuse_detected",
            },
        });

        throw new AppError(401, "unauthorized", "Refresh token is no longer valid");
    }

    if (existingToken.expiresAt <= new Date()) {
        await prisma.refreshToken.update({
            where: { id: existingToken.id },
            data: {
                revokedAt: new Date(),
                revocationReason: "expired",
            },
        });

        throw new AppError(401, "unauthorized", "Refresh token has expired");
    }

    if (!existingToken.user.isActive) {
        throw new AppError(403, "forbidden", "This account is inactive");
    }

    return prisma.$transaction(async (tx) => {
        const session = await issueSession(tx, existingToken.user, context);

        await tx.refreshToken.update({
            where: { id: existingToken.id },
            data: {
                revokedAt: new Date(),
                revocationReason: "rotated",
                replacedByTokenId: session.refreshTokenId,
                lastUsedAt: new Date(),
            },
        });

        return {
            user: sanitizeUser(existingToken.user),
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        };
    });
};

export const logout = async (refreshToken?: string): Promise<LogoutResponse> => {
    if (!refreshToken) {
        return { success: true };
    }

    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
        where: {
            tokenHash,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
            revocationReason: "logout",
        },
    });

    return { success: true };
};

export const getCurrentUser = async (userId: string): Promise<AuthResponse> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError(401, "unauthorized", "User not found");
    }

    if (!user.isActive) {
        throw new AppError(403, "forbidden", "This account is inactive");
    }

    return {
        user: sanitizeUser(user),
    };
};

export const updateCurrentUser = async (userId: string, input: { name: string }): Promise<AuthResponse> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError(401, "unauthorized", "User not found");
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            name: input.name,
        },
    });

    return {
        user: sanitizeUser(updated),
    };
};

export const resendEmailVerification = async (userId: string): Promise<{ success: true }> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.isActive) {
        throw new AppError(404, "not_found", "User not found");
    }

    if (user.mfaEnabled) {
        throw new AppError(409, "conflict", "MFA is already enabled");
    }

    if (user.emailVerifiedAt) {
        return { success: true };
    }

    const token = await prisma.$transaction((tx) => createEmailVerificationToken(tx, user.id));
    void sendVerificationEmail(user.email, token);
    return { success: true };
};

export const verifyEmail = async (token: string): Promise<{ success: true }> => {
    const tokenHash = hashToken(token);

    const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
        include: { user: true },
    });

    if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt <= new Date()) {
        throw new AppError(400, "invalid_token", "Verification link is invalid or expired");
    }

    await prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.update({
            where: { id: verificationToken.id },
            data: {
                usedAt: new Date(),
            },
        });

        if (!verificationToken.user.emailVerifiedAt) {
            await tx.user.update({
                where: { id: verificationToken.userId },
                data: {
                    emailVerifiedAt: new Date(),
                },
            });
        }
    });

    return { success: true };
};

export const requestPasswordReset = async (email: string): Promise<{ success: true }> => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user || !user.isActive) {
        return { success: true };
    }

    const token = await prisma.$transaction((tx) => createPasswordResetToken(tx, user.id));
    void sendPasswordResetEmail(user.email, token);
    return { success: true };
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ success: true }> => {
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
    });

    if (!passwordResetToken || passwordResetToken.usedAt || passwordResetToken.expiresAt <= new Date()) {
        throw new AppError(400, "invalid_token", "Password reset link is invalid or expired");
    }

    await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.update({
            where: {
                id: passwordResetToken.id,
            },
            data: {
                usedAt: new Date(),
            },
        });

        await tx.user.update({
            where: { id: passwordResetToken.userId },
            data: {
                passwordHash: await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS),
            },
        });

        await invalidateAllActiveUserSessions(tx, passwordResetToken.userId, "password_reset");
    });

    void sendSecurityEventEmail(
        passwordResetToken.user.email,
        "Password reset completed",
        "Your password was reset and all active sessions were signed out.",
    );

    return { success: true };
};

export const startMfaSetup = async (userId: string): Promise<MfaSetupStartResponse> => {
    if (!config.AUTH_ENABLE_MFA) {
        throw new AppError(404, "not_found", "MFA is not enabled");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.isActive) {
        throw new AppError(404, "not_found", "User not found");
    }

    const secret = generateTotpSecret();
    const encryptedSecret = encryptMfaSecret(secret);

    await prisma.user.update({
        where: { id: userId },
        data: {
            mfaSecretEncrypted: encryptedSecret,
            mfaEnabled: false,
            mfaEnabledAt: null,
        },
    });

    const issuer = "PricePulse";
    const label = encodeURIComponent(`${issuer}:${user.email}`);
    const otpauthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

    return {
        secret,
        otpauthUri,
    };
};

export const confirmMfaSetup = async (
    userId: string,
    input: MfaSetupConfirmRequest,
): Promise<MfaRecoveryCodesResponse> => {
    if (!config.AUTH_ENABLE_MFA) {
        throw new AppError(404, "not_found", "MFA is not enabled");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.isActive || !user.mfaSecretEncrypted) {
        throw new AppError(400, "bad_request", "MFA setup was not started");
    }

    const secret = decryptMfaSecret(user.mfaSecretEncrypted);
    if (!verifyTotpCode(secret, input.code)) {
        throw new AppError(400, "bad_request", "Invalid MFA code");
    }

    const recoveryCodes = generateRecoveryCodes();

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: true,
                mfaEnabledAt: new Date(),
            },
        });

        await tx.mfaRecoveryCode.deleteMany({
            where: { userId },
        });

        await tx.mfaRecoveryCode.createMany({
            data: recoveryCodes.map((code) => ({
                userId,
                codeHash: hashToken(normalizeRecoveryCode(code)),
            })),
        });
    });

    void sendSecurityEventEmail(user.email, "MFA enabled", "Multi-factor authentication was enabled on your account.");

    return { recoveryCodes };
};

export const disableMfa = async (userId: string, input: MfaDisableRequest): Promise<{ success: true }> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.isActive) {
        throw new AppError(404, "not_found", "User not found");
    }

    await verifyStepUp(user, input);

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: {
                mfaEnabled: false,
                mfaEnabledAt: null,
                mfaSecretEncrypted: null,
            },
        });

        await tx.mfaRecoveryCode.deleteMany({
            where: { userId },
        });
    });

    void sendSecurityEventEmail(
        user.email,
        "MFA disabled",
        "Multi-factor authentication was disabled on your account.",
    );
    return { success: true };
};

export const regenerateRecoveryCodes = async (
    userId: string,
    input: MfaDisableRequest,
): Promise<MfaRecoveryCodesResponse> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.isActive || !user.mfaEnabled) {
        throw new AppError(404, "not_found", "MFA is not enabled");
    }

    await verifyStepUp(user, input);
    const recoveryCodes = generateRecoveryCodes();

    await prisma.$transaction(async (tx) => {
        await tx.mfaRecoveryCode.deleteMany({
            where: { userId },
        });

        await tx.mfaRecoveryCode.createMany({
            data: recoveryCodes.map((code) => ({
                userId,
                codeHash: hashToken(normalizeRecoveryCode(code)),
            })),
        });
    });

    void sendSecurityEventEmail(
        user.email,
        "Recovery codes regenerated",
        "Recovery codes were regenerated for your account.",
    );

    return { recoveryCodes };
};

const toSessionDto = (token: RefreshToken, currentTokenHash?: string): AuthSession => ({
    id: token.id,
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString(),
    expiresAt: token.expiresAt.toISOString(),
    revokedAt: token.revokedAt?.toISOString(),
    createdByIp: token.createdByIp ?? undefined,
    createdByUserAgent: token.createdByUserAgent ?? undefined,
    label: token.label ?? undefined,
    isCurrent: currentTokenHash ? currentTokenHash === token.tokenHash : false,
});

export const listSessions = async (userId: string, currentRefreshToken?: string): Promise<AuthSessionListResponse> => {
    if (!config.AUTH_ENABLE_SESSION_MANAGEMENT) {
        throw new AppError(404, "not_found", "Session management is disabled");
    }

    const sessions = await prisma.refreshToken.findMany({
        where: {
            userId,
            revokedAt: null,
            expiresAt: {
                gt: new Date(),
            },
        },
        orderBy: [{ createdAt: "desc" }],
    });

    const currentTokenHash = currentRefreshToken ? hashToken(currentRefreshToken) : undefined;
    return {
        sessions: sessions.map((session) => toSessionDto(session, currentTokenHash)),
    };
};

export const revokeSession = async (
    userId: string,
    sessionId: string,
    input: SessionRevokeRequest,
): Promise<{ success: true }> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.isActive) {
        throw new AppError(404, "not_found", "User not found");
    }

    await verifyStepUp(user, input);

    const session = await prisma.refreshToken.findFirst({
        where: {
            id: sessionId,
            userId,
        },
    });

    if (!session) {
        throw new AppError(404, "not_found", "Session not found");
    }

    await prisma.refreshToken.update({
        where: { id: session.id },
        data: {
            revokedAt: new Date(),
            revocationReason: "session_revoked",
        },
    });

    return { success: true };
};

export const revokeOtherSessions = async (
    userId: string,
    currentRefreshToken: string | undefined,
    input: SessionRevokeOthersRequest,
): Promise<{ success: true }> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.isActive) {
        throw new AppError(404, "not_found", "User not found");
    }

    await verifyStepUp(user, input);

    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    await prisma.refreshToken.updateMany({
        where: {
            userId,
            revokedAt: null,
            ...(currentHash ? { tokenHash: { not: currentHash } } : {}),
        },
        data: {
            revokedAt: new Date(),
            revocationReason: "revoke_others",
        },
    });

    return { success: true };
};

export const cleanupExpiredAuthTokens = async (): Promise<{
    emailVerificationDeleted: number;
    passwordResetDeleted: number;
    mfaChallengesDeleted: number;
}> => {
    const now = new Date();

    const [emailVerificationDeleted, passwordResetDeleted, mfaChallengesDeleted] = await prisma.$transaction([
        prisma.emailVerificationToken.deleteMany({
            where: {
                OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
            },
        }),
        prisma.passwordResetToken.deleteMany({
            where: {
                OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
            },
        }),
        prisma.mfaLoginChallenge.deleteMany({
            where: {
                OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
            },
        }),
    ]);

    return {
        emailVerificationDeleted: emailVerificationDeleted.count,
        passwordResetDeleted: passwordResetDeleted.count,
        mfaChallengesDeleted: mfaChallengesDeleted.count,
    };
};
