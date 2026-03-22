import type { NextFunction, Request, Response } from "express";
import { UserRole as PrismaUserRole } from "@prisma/client";
import { authCookieNames } from "../lib/cookies";
import { AppError } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const roleMap: Record<PrismaUserRole, "free" | "paid" | "admin"> = {
    FREE: "free",
    PAID: "paid",
    ADMIN: "admin",
};

const authzFreshStateKey = Symbol("authz_fresh_state");

interface FreshAuthState {
    role: "free" | "paid" | "admin";
    isActive: boolean;
    tokenVersion: number;
}

type RequestWithFreshState = Request & {
    [authzFreshStateKey]?: FreshAuthState;
};

const getFreshAuthState = async (request: Request): Promise<FreshAuthState | null> => {
    const cached = (request as RequestWithFreshState)[authzFreshStateKey];
    if (cached) {
        return cached;
    }

    if (!request.auth) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: request.auth.userId },
        select: {
            role: true,
            isActive: true,
            tokenVersion: true,
        },
    });

    if (!user) {
        return null;
    }

    const freshState: FreshAuthState = {
        role: roleMap[user.role],
        isActive: user.isActive,
        tokenVersion: user.tokenVersion,
    };
    (request as RequestWithFreshState)[authzFreshStateKey] = freshState;

    return freshState;
};

export const hydrateAuthOptional = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        const accessToken = req.cookies[authCookieNames.accessToken] as string | undefined;

        if (!accessToken) {
            next();
            return;
        }

        const payload = verifyAccessToken(accessToken);
        if (payload.type !== "access") {
            next();
            return;
        }

        req.auth = {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            tokenType: payload.type,
            tokenVersion: payload.tokenVersion,
        };
    } catch {
        // Optional hydration must fail open.
    }

    next();
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        const accessToken = req.cookies[authCookieNames.accessToken] as string | undefined;

        if (!accessToken) {
            throw new AppError(401, "unauthorized", "Authentication required");
        }

        const payload = verifyAccessToken(accessToken);

        if (payload.type !== "access") {
            throw new AppError(401, "unauthorized", "Invalid token type");
        }

        req.auth = {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            tokenType: payload.type,
            tokenVersion: payload.tokenVersion,
        };

        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
            return;
        }

        next(new AppError(401, "unauthorized", "Invalid or expired access token"));
    }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
        next(new AppError(401, "unauthorized", "Authentication required"));
        return;
    }

    if (req.auth.role !== "admin") {
        next(new AppError(403, "forbidden", "Admin access required"));
        return;
    }

    next();
};

export const requireAuthzFresh = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.auth) {
            throw new AppError(401, "unauthorized", "Authentication required");
        }

        if (!config.AUTHZ_FRESHNESS_ENABLED && !config.AUTH_TOKEN_VERSION_ENFORCED) {
            next();
            return;
        }

        const freshState = await getFreshAuthState(req);

        if (!freshState || !freshState.isActive) {
            throw new AppError(403, "forbidden", "This account is inactive");
        }

        if (config.AUTHZ_FRESHNESS_ENABLED && freshState.role !== req.auth.role) {
            throw new AppError(403, "forbidden", "Access role is no longer valid");
        }

        const tokenVersion = req.auth.tokenVersion;

        if (typeof tokenVersion !== "number") {
            if (config.AUTH_TOKEN_VERSION_ENFORCED) {
                throw new AppError(401, "unauthorized", "Invalid or expired access token");
            }

            logger.info("auth_token_version_missing_claim", {
                userId: req.auth.userId,
            });
            next();
            return;
        }

        if (tokenVersion !== freshState.tokenVersion) {
            throw new AppError(401, "unauthorized", "Invalid or expired access token");
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const requireVerifiedEmail = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!config.AUTH_REQUIRE_VERIFIED_EMAIL) {
            next();
            return;
        }

        if (!req.auth) {
            throw new AppError(401, "unauthorized", "Authentication required");
        }

        const user = await prisma.user.findUnique({
            where: { id: req.auth.userId },
            select: { emailVerifiedAt: true },
        });

        if (!user?.emailVerifiedAt) {
            throw new AppError(403, "forbidden", "Email verification is required");
        }

        next();
    } catch (error) {
        next(error);
    }
};
