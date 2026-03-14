import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config";

const OAUTH_CHALLENGE_COOKIE_NAME_PRODUCTION = "__Host-oauth_challenge";
const OAUTH_CHALLENGE_COOKIE_NAME_DEVELOPMENT = "oauth_challenge";

const buildAesKey = (): Buffer =>
    createHash("sha256")
        .update(config.AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY ?? "oauth-code-verifier-key-disabled")
        .digest();

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

export const signOAuthChallengeCookieValue = (challengeId: string): string => {
    const signature = buildCookieSignature(
        challengeId,
        config.AUTH_OAUTH_COOKIE_SIGNING_KEY ?? "oauth-cookie-disabled",
    );
    return `${challengeId}.${signature}`;
};

export const verifyOAuthChallengeCookieValue = (cookieValue?: string): string | null => {
    if (!cookieValue) {
        return null;
    }

    const [challengeId, signature] = cookieValue.split(".");
    if (!challengeId || !signature) {
        return null;
    }

    const currentKey = config.AUTH_OAUTH_COOKIE_SIGNING_KEY;
    const previousKey = config.AUTH_OAUTH_COOKIE_SIGNING_KEY_PREVIOUS;
    const expectedSignatures = [currentKey, previousKey]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .map((key) => buildCookieSignature(challengeId, key));

    if (expectedSignatures.length === 0) {
        return null;
    }

    for (const expected of expectedSignatures) {
        if (safeEqual(signature, expected)) {
            return challengeId;
        }
    }

    return null;
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
