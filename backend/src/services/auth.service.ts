import bcrypt from "bcrypt";
import { Prisma, UserRole as PrismaUserRole, type NotificationChannelType, type User } from "@prisma/client";
import type { AuthResponse, AuthUser, LoginRequest, LogoutResponse, RegisterRequest, UserRole } from "@mabrik/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { generateRefreshToken, hashToken } from "../lib/hash";
import { signAccessToken } from "../lib/jwt";
import { config } from "../config";

interface SessionTokens {
    accessToken: string;
    refreshToken: string;
}

interface AuthResult extends AuthResponse, SessionTokens {}

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
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
});

const getRefreshExpiry = (): Date =>
    new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

const issueSession = async (
    tx: Prisma.TransactionClient,
    user: User,
): Promise<{ accessToken: string; refreshToken: string; refreshTokenId: string }> => {
    const refreshToken = generateRefreshToken();
    const refreshTokenRecord = await tx.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: hashToken(refreshToken),
            expiresAt: getRefreshExpiry(),
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

export const register = async (input: RegisterRequest): Promise<AuthResult> => {
    try {
        return await prisma.$transaction(async (tx) => {
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

            const session = await issueSession(tx, user);

            return {
                user: sanitizeUser(user),
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
            };
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError(409, "conflict", "Failed to register user");
        }

        throw error;
    }
};

export const login = async (input: LoginRequest): Promise<AuthResult> => {
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

    const session = await prisma.$transaction((tx) => issueSession(tx, user));

    return {
        user: sanitizeUser(user),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
    };
};

export const refreshSession = async (refreshToken: string): Promise<AuthResult> => {
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
        const session = await issueSession(tx, existingToken.user);

        await tx.refreshToken.update({
            where: { id: existingToken.id },
            data: {
                revokedAt: new Date(),
                revocationReason: "rotated",
                replacedByTokenId: session.refreshTokenId,
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
