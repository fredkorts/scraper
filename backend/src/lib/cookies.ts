import type { Response } from "express";
import { config } from "../config";

const secure = config.NODE_ENV === "production";

const baseCookieOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure,
    path: "/",
};

const parseAccessTokenTtlMs = (ttl: string): number => {
    const match = ttl.match(/^(\d+)([smhd])$/);

    if (!match) {
        throw new Error(`Unsupported ACCESS_TOKEN_TTL format: ${ttl}`);
    }

    const value = Number(match[1]);
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };
    const unit = match[2] as keyof typeof multipliers;

    return value * multipliers[unit];
};

export const authCookieNames = {
    accessToken: "access_token",
    refreshToken: "refresh_token",
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
    res.cookie(authCookieNames.accessToken, accessToken, {
        ...baseCookieOptions,
        maxAge: parseAccessTokenTtlMs(config.ACCESS_TOKEN_TTL),
    });

    res.cookie(authCookieNames.refreshToken, refreshToken, {
        ...baseCookieOptions,
        maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
};

export const clearAuthCookies = (res: Response): void => {
    res.clearCookie(authCookieNames.accessToken, baseCookieOptions);
    res.clearCookie(authCookieNames.refreshToken, baseCookieOptions);
};
