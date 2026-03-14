import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "../lib/errors";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_CERTS_ENDPOINT = "https://www.googleapis.com/oauth2/v1/certs";
const GOOGLE_ACCEPTED_ISSUERS = ["accounts.google.com", "https://accounts.google.com"] as const;
const GOOGLE_SIGNING_ALGORITHMS = ["RS256"] as const;
const OAUTH_CLOCK_TOLERANCE_SECONDS = 300;

interface GoogleTokenResponse {
    id_token?: string;
}

type GoogleCertsResponse = Record<string, string>;

type VerifiedGoogleIdTokenPayload = jwt.JwtPayload & {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    nonce?: string;
    aud?: string | string[];
    azp?: string;
    iss?: string;
};

export interface GoogleIdentityClaims {
    subject: string;
    email: string;
    emailVerified: boolean;
}

let cachedGoogleCerts: {
    certs: GoogleCertsResponse;
    expiresAtMs: number;
} | null = null;

const safeEqual = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
};

const parseCacheControlMaxAgeMs = (cacheControlHeader: string | null): number | null => {
    if (!cacheControlHeader) {
        return null;
    }

    const match = cacheControlHeader.match(/max-age=(\d+)/i);
    if (!match) {
        return null;
    }

    const seconds = Number.parseInt(match[1], 10);
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return null;
    }

    return seconds * 1000;
};

const fetchGoogleCerts = async (): Promise<GoogleCertsResponse> => {
    if (cachedGoogleCerts && cachedGoogleCerts.expiresAtMs > Date.now()) {
        return cachedGoogleCerts.certs;
    }

    const response = await fetch(GOOGLE_CERTS_ENDPOINT, {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
    }

    const payload = (await response.json()) as GoogleCertsResponse;
    const maxAgeMs = parseCacheControlMaxAgeMs(response.headers.get("cache-control")) ?? 60 * 60 * 1000;
    cachedGoogleCerts = {
        certs: payload,
        expiresAtMs: Date.now() + maxAgeMs,
    };

    return payload;
};

export const buildGoogleAuthorizationUrl = (input: { state: string; nonce: string; codeChallenge: string }): string => {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: config.GOOGLE_OAUTH_CLIENT_ID ?? "",
        redirect_uri: config.GOOGLE_OAUTH_REDIRECT_URI ?? "",
        scope: "openid email profile",
        state: input.state,
        nonce: input.nonce,
        code_challenge: input.codeChallenge,
        code_challenge_method: "S256",
        prompt: "select_account",
    });

    return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
};

export const exchangeGoogleAuthorizationCode = async (input: {
    code: string;
    codeVerifier: string;
}): Promise<{ idToken: string }> => {
    const body = new URLSearchParams({
        code: input.code,
        client_id: config.GOOGLE_OAUTH_CLIENT_ID ?? "",
        client_secret: config.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
        redirect_uri: config.GOOGLE_OAUTH_REDIRECT_URI ?? "",
        grant_type: "authorization_code",
        code_verifier: input.codeVerifier,
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body,
    });

    if (!response.ok) {
        throw new AppError(401, "oauth_google_exchange_failed", "Google authentication failed");
    }

    const payload = (await response.json()) as GoogleTokenResponse;
    if (!payload.id_token) {
        throw new AppError(401, "oauth_google_exchange_failed", "Google authentication failed");
    }

    return {
        idToken: payload.id_token,
    };
};

export const verifyGoogleIdToken = async (input: {
    idToken: string;
    expectedNonce: string;
}): Promise<GoogleIdentityClaims> => {
    const decoded = jwt.decode(input.idToken, { complete: true });
    if (!decoded || typeof decoded !== "object" || !("header" in decoded)) {
        throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
    }

    const header = decoded.header as jwt.JwtHeader;
    if (!header.kid || header.alg !== "RS256") {
        throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
    }

    const certs = await fetchGoogleCerts();
    const certificate = certs[header.kid];
    if (!certificate) {
        throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
    }

    const payload = jwt.verify(input.idToken, certificate, {
        algorithms: [...GOOGLE_SIGNING_ALGORITHMS],
        issuer: [...GOOGLE_ACCEPTED_ISSUERS],
        audience: config.GOOGLE_OAUTH_CLIENT_ID,
        clockTolerance: OAUTH_CLOCK_TOLERANCE_SECONDS,
    }) as VerifiedGoogleIdTokenPayload;

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
    }

    if (typeof payload.email !== "string" || payload.email.length === 0) {
        throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
    }

    const emailVerified =
        payload.email_verified === true ||
        (typeof payload.email_verified === "string" && payload.email_verified === "true");
    if (!emailVerified) {
        throw new AppError(401, "oauth_google_email_not_verified", "Google email is not verified");
    }

    if (typeof payload.nonce !== "string" || !safeEqual(payload.nonce, input.expectedNonce)) {
        throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
    }

    if (Array.isArray(payload.aud) && payload.aud.length > 1) {
        if (typeof payload.azp !== "string" || payload.azp !== config.GOOGLE_OAUTH_CLIENT_ID) {
            throw new AppError(401, "oauth_google_validation_failed", "Google authentication failed");
        }
    }

    return {
        subject: payload.sub,
        email: payload.email,
        emailVerified,
    };
};
