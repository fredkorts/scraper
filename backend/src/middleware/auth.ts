import type { NextFunction, Request, Response } from "express";
import { authCookieNames } from "../lib/cookies";
import { AppError } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";
import { config } from "../config";
import { prisma } from "../lib/prisma";

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
