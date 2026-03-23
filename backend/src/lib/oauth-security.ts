import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config";

const OAUTH_CHALLENGE_COOKIE_NAME_PRODUCTION = "__Host-oauth_challenge";
const OAUTH_CHALLENGE_COOKIE_NAME_DEVELOPMENT = "oauth_challenge";
const OAUTH_CHALLENGE_COOKIE_VERSION = "v2";
const OAUTH_CHALLENGE_COOKIE_AAD = Buffer.from("pricepulse:oauth_challenge_cookie:v2");

const buildAesKey = (): Buffer =>
    createHash("sha256")
        .update(config.AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY ?? "oauth-code-verifier-key-disabled")
        .digest();

const buildCookieEnvelopeKey = (key: string): Buffer =>
    createHash("sha256").update(`oauth-cookie-envelope:${key}`).digest();

const buildCookieSignature = (value: string, key: string): string => {
    return createHmac("sha256", key).update(value).digest("base64url");
};

const safeEqual = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
};

export const getOAuthChallengeCookieName = (): string => {
    return config.NODE_ENV === "production"
        ? OAUTH_CHALLENGE_COOKIE_NAME_PRODUCTION
        : OAUTH_CHALLENGE_COOKIE_NAME_DEVELOPMENT;
};

const getOAuthCookieKeys = (): string[] => {
    const keys = [config.AUTH_OAUTH_COOKIE_SIGNING_KEY, config.AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
    );

    return Array.from(new Set(keys));
};

const encryptOAuthChallengeId = (challengeId: string, key: string): string => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", buildCookieEnvelopeKey(key), iv);
    cipher.setAAD(OAUTH_CHALLENGE_COOKIE_AAD);
    const encrypted = Buffer.concat([cipher.update(challengeId, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
};

const decryptOAuthChallengeId = (payload: string, key: string): string | null => {
    const [ivEncoded, tagEncoded, encryptedPayload] = payload.split(".");
    if (!ivEncoded || !tagEncoded || !encryptedPayload) {
        return null;
    }

    try {
        const iv = Buffer.from(ivEncoded, "base64url");
        const tag = Buffer.from(tagEncoded, "base64url");
        const encrypted = Buffer.from(encryptedPayload, "base64url");
        const decipher = createDecipheriv("aes-256-gcm", buildCookieEnvelopeKey(key), iv);
        decipher.setAAD(OAUTH_CHALLENGE_COOKIE_AAD);
        decipher.setAuthTag(tag);

        const challengeId = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
        return challengeId.length > 0 ? challengeId : null;
    } catch {
        return null;
    }
};

const verifyLegacySignedChallengeValue = (cookieValue: string, keys: readonly string[]): string | null => {
    const [challengeId, signature] = cookieValue.split(".");
    if (!challengeId || !signature) {
        return null;
    }

    const expectedSignatures = keys.map((key) => buildCookieSignature(challengeId, key));

    for (const expected of expectedSignatures) {
        if (safeEqual(signature, expected)) {
            return challengeId;
        }
    }

    return null;
};

export const signOAuthChallengeCookieValue = (challengeId: string): string => {
    const currentKey = config.AUTH_OAUTH_COOKIE_SIGNING_KEY ?? "oauth-cookie-disabled";
    const sealedPayload = encryptOAuthChallengeId(challengeId, currentKey);
    return `${OAUTH_CHALLENGE_COOKIE_VERSION}.${sealedPayload}`;
};

export const verifyOAuthChallengeCookieValue = (cookieValue?: string): string | null => {
    if (!cookieValue) {
        return null;
    }

    const keys = getOAuthCookieKeys();
    if (keys.length === 0) {
        return null;
    }

    const [prefix, ...rest] = cookieValue.split(".");

    if (prefix === OAUTH_CHALLENGE_COOKIE_VERSION) {
        const sealedPayload = rest.join(".");
        if (!sealedPayload) {
            return null;
        }

        for (const key of keys) {
            const challengeId = decryptOAuthChallengeId(sealedPayload, key);
            if (challengeId) {
                return challengeId;
            }
        }

        return null;
    }

    // Backward compatibility for in-flight cookies minted before value encryption.
    return verifyLegacySignedChallengeValue(cookieValue, keys);
};

export const generateOAuthState = (): string => randomBytes(32).toString("base64url");

export const generateOAuthNonce = (): string => randomBytes(32).toString("base64url");

export const generatePkceCodeVerifier = (): string => randomBytes(48).toString("base64url");

export const generatePkceCodeChallenge = (codeVerifier: string): string => {
    return createHash("sha256").update(codeVerifier).digest("base64url");
};

export const hashOAuthState = (state: string): string => {
    return createHash("sha256").update(state).digest("hex");
};

export const encryptOAuthCodeVerifier = (value: string): string => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", buildAesKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
};

export const decryptOAuthCodeVerifier = (encryptedValue: string): string => {
    const [ivEncoded, tagEncoded, payloadEncoded] = encryptedValue.split(".");
    if (!ivEncoded || !tagEncoded || !payloadEncoded) {
        throw new Error("Invalid encrypted oauth code verifier format");
    }

    const iv = Buffer.from(ivEncoded, "base64url");
    const tag = Buffer.from(tagEncoded, "base64url");
    const payload = Buffer.from(payloadEncoded, "base64url");

    const decipher = createDecipheriv("aes-256-gcm", buildAesKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
};
