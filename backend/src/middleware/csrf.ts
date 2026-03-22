import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { authCookieNames } from "../lib/cookies";
import { AppError } from "../lib/errors";
import { isTrustedOrigin } from "../lib/trusted-origins";

const csrfHeaderName = "x-csrf-token";

const parseRequestOrigin = (request: Request): string | null => {
    const originHeader = request.headers.origin;
    if (typeof originHeader === "string" && originHeader.trim().length > 0) {
        return originHeader;
    }

    const refererHeader = request.headers.referer;
    if (typeof refererHeader === "string" && refererHeader.trim().length > 0) {
        try {
            return new URL(refererHeader).origin;
        } catch {
            return null;
        }
    }

    return null;
};

const safeEqual = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
};

export const requireTrustedOrigin = (request: Request, _response: Response, next: NextFunction): void => {
    const requestOrigin = parseRequestOrigin(request);

    if (!requestOrigin || !isTrustedOrigin(requestOrigin)) {
        next(new AppError(403, "origin_not_allowed", "Origin is not allowed"));
        return;
    }

    next();
};

export const requireCsrf = (request: Request, _response: Response, next: NextFunction): void => {
    const cookieToken = request.cookies[authCookieNames.csrfToken] as string | undefined;
    const headerToken = request.headers[csrfHeaderName] as string | undefined;

    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
        next(new AppError(403, "csrf_mismatch", "CSRF token mismatch"));
        return;
    }

    next();
};

export const cookieAuthMutationExemptions = [
    {
        path: "/api/notifications/telegram/webhook",
        reason: "Webhook uses x-telegram-bot-api-secret-token shared-secret authentication instead of browser cookies.",
    },
] as const;

export const requireMutationProtection = (request: Request, response: Response, next: NextFunction): void => {
    if (!config.AUTH_MUTATION_CSRF_STRICT_MODE) {
        next();
        return;
    }

    requireTrustedOrigin(request, response, (originError) => {
        if (originError) {
            next(originError);
            return;
        }

        requireCsrf(request, response, next);
    });
};
