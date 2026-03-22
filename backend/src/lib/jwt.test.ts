import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";
import { config } from "../config";
import { signAccessToken, verifyAccessToken } from "./jwt";

const originalJwtSecret = config.JWT_SECRET;
const originalActiveKid = config.AUTH_JWT_ACTIVE_KID;
const originalJwtKeysJson = config.AUTH_JWT_KEYS_JSON;

const resetJwtConfig = (): void => {
    config.JWT_SECRET = originalJwtSecret;
    config.AUTH_JWT_ACTIVE_KID = originalActiveKid;
    config.AUTH_JWT_KEYS_JSON = originalJwtKeysJson;
};

describe("jwt helpers", () => {
    afterEach(() => {
        resetJwtConfig();
    });

    it("signs and verifies a valid access token", () => {
        const token = signAccessToken({
            sub: "user-id",
            email: "user@example.com",
            role: "free",
        });

        const payload = verifyAccessToken(token);

        expect(payload.sub).toBe("user-id");
        expect(payload.email).toBe("user@example.com");
        expect(payload.role).toBe("free");
        expect(payload.type).toBe("access");
    });

    it("verifies tokens signed by previous keys during rotation", () => {
        config.AUTH_JWT_ACTIVE_KID = "active";
        config.AUTH_JWT_KEYS_JSON = JSON.stringify({
            active: "active-secret-key-with-at-least-32-characters",
            previous: "previous-secret-key-with-at-least-32-chars",
        });

        const token = jwt.sign(
            {
                sub: "user-id",
                email: "user@example.com",
                role: "paid",
                type: "access",
                tokenVersion: 2,
            },
            "previous-secret-key-with-at-least-32-chars",
            {
                algorithm: "HS256",
                expiresIn: "15m",
                issuer: config.JWT_ISSUER,
                audience: config.JWT_AUDIENCE,
                header: {
                    kid: "previous",
                    alg: "HS256",
                },
            },
        );

        const payload = verifyAccessToken(token);

        expect(payload.sub).toBe("user-id");
        expect(payload.role).toBe("paid");
        expect(payload.tokenVersion).toBe(2);
    });

    it("rejects tokens with an unknown kid", () => {
        config.AUTH_JWT_ACTIVE_KID = "active";
        config.AUTH_JWT_KEYS_JSON = JSON.stringify({
            active: "active-secret-key-with-at-least-32-characters",
        });

        const token = jwt.sign(
            {
                sub: "user-id",
                email: "user@example.com",
                role: "free",
                type: "access",
            },
            "some-unknown-secret-key-with-at-least-32chars",
            {
                expiresIn: "15m",
                issuer: config.JWT_ISSUER,
                audience: config.JWT_AUDIENCE,
                header: {
                    kid: "unknown",
                    alg: "HS256",
                },
            },
        );

        expect(() => verifyAccessToken(token)).toThrow();
    });

    it("rejects tokens signed with alg:none", () => {
        const token = jwt.sign(
            {
                sub: "user-id",
                email: "user@example.com",
                role: "free",
                type: "access",
                iss: config.JWT_ISSUER,
                aud: config.JWT_AUDIENCE,
                exp: Math.floor(Date.now() / 1000) + 60,
            },
            null,
            {
                algorithm: "none",
            },
        );

        expect(() => verifyAccessToken(token)).toThrow();
    });

    it("rejects tokens with missing required claims", () => {
        const token = jwt.sign(
            {
                sub: "user-id",
                email: "user@example.com",
                role: "free",
            },
            config.JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: "15m",
                issuer: config.JWT_ISSUER,
                audience: config.JWT_AUDIENCE,
            },
        );

        expect(() => verifyAccessToken(token)).toThrow();
    });
});
