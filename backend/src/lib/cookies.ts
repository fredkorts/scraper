import type { Response } from "express";
import { config } from "../config";
import { generateOneTimeToken } from "./hash";
import { getOAuthChallengeCookieName } from "./oauth-security";

const secure = config.NODE_ENV === "production";
const sameSite = config.AUTH_COOKIE_SAMESITE;

const baseCookieOptions = {
    httpOnly: true,
    sameSite,
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
    csrfToken: "csrf_token",
    oauthChallenge: getOAuthChallengeCookieName(),
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

export const setCsrfCookie = (res: Response, csrfToken = generateOneTimeToken()): string => {
    res.cookie(authCookieNames.csrfToken, csrfToken, {
        httpOnly: false,
        sameSite,
        secure,
        path: "/",
        maxAge: config.AUTH_CSRF_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    });

    return csrfToken;
};

export const setOAuthChallengeCookie = (res: Response, value: string): void => {
    res.cookie(authCookieNames.oauthChallenge, value, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 10 * 60 * 1000,
    });
};

export const clearOAuthChallengeCookie = (res: Response): void => {
    res.clearCookie(authCookieNames.oauthChallenge, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
    });
};

export const clearAuthCookies = (res: Response): void => {
    res.clearCookie(authCookieNames.accessToken, baseCookieOptions);
    res.clearCookie(authCookieNames.refreshToken, baseCookieOptions);
    res.clearCookie(authCookieNames.csrfToken, {
        ...baseCookieOptions,
        httpOnly: false,
    });
};
