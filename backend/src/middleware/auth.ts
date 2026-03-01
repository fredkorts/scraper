import type { NextFunction, Request, Response } from "express";
import { authCookieNames } from "../lib/cookies";
import { AppError } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";

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
