import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { generateRefreshToken, hashToken } from "../lib/hash";

interface UserFactoryOptions {
    email?: string;
    password?: string;
    name?: string;
    isActive?: boolean;
}

export const createUser = async (options: UserFactoryOptions = {}) => {
    const email = options.email ?? "user@example.com";
    const password = options.password ?? "Password123";
    const name = options.name ?? "Test User";
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            name,
            isActive: options.isActive ?? true,
        },
    });

    return { user, password };
};

interface RefreshTokenFactoryOptions {
    userId: string;
    expiresAt?: Date;
    revokedAt?: Date | null;
    revocationReason?: string | null;
    replacedByTokenId?: string | null;
}

export const createRefreshTokenRecord = async (options: RefreshTokenFactoryOptions) => {
    const rawToken = generateRefreshToken();

    const record = await prisma.refreshToken.create({
        data: {
            userId: options.userId,
            tokenHash: hashToken(rawToken),
            expiresAt: options.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
            revokedAt: options.revokedAt ?? null,
            revocationReason: options.revocationReason ?? null,
            replacedByTokenId: options.replacedByTokenId ?? null,
        },
    });

    return { rawToken, record };
};
