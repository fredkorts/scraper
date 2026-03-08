import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { authCookieNames, setCsrfCookie } from "../lib/cookies";
import { AppError } from "../lib/errors";

const trustedOrigin = new URL(config.FRONTEND_URL).origin;
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

export const issueCsrfCookie = (_request: Request, response: Response): void => {
    setCsrfCookie(response);
};

export const requireTrustedOrigin = (request: Request, _response: Response, next: NextFunction): void => {
    const requestOrigin = parseRequestOrigin(request);

    if (!requestOrigin || requestOrigin !== trustedOrigin) {
        next(new AppError(403, "forbidden", "Origin is not allowed"));
        return;
    }

    next();
};

export const requireCsrf = (request: Request, _response: Response, next: NextFunction): void => {
    const cookieToken = request.cookies[authCookieNames.csrfToken] as string | undefined;
    const headerToken = request.headers[csrfHeaderName] as string | undefined;

    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
        next(new AppError(403, "forbidden", "CSRF token mismatch"));
        return;
    }

    next();
};
