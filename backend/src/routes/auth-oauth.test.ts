import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { createApp } from "../app";
import { authCookieNames } from "../lib/cookies";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";
import { extractCookieValue } from "../test/http";

vi.hoisted(() => {
    process.env.AUTH_GOOGLE_OAUTH_ENABLED = "true";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-google-client-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:3001/api/auth/oauth/google/callback";
    process.env.AUTH_OAUTH_COOKIE_SIGNING_KEY = "test-oauth-cookie-signing-key-test-oauth-cookie-signing-key";
    process.env.AUTH_OAUTH_CODE_VERIFIER_ENCRYPTION_KEY =
        "test-oauth-verifier-encryption-key-test-oauth-verifier-encryption-key";
});

const exchangeGoogleAuthorizationCode = vi.fn();
const verifyGoogleIdToken = vi.fn();

vi.mock("../services/google-oauth.service", () => ({
    buildGoogleAuthorizationUrl: (input: { state: string; nonce: string; codeChallenge: string }) => {
        const params = new URLSearchParams({
            state: input.state,
            nonce: input.nonce,
            code_challenge: input.codeChallenge,
            code_challenge_method: "S256",
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    },
    exchangeGoogleAuthorizationCode: (...args: unknown[]) => exchangeGoogleAuthorizationCode(...args),
    verifyGoogleIdToken: (...args: unknown[]) => verifyGoogleIdToken(...args),
}));

useTestDatabase();

describe("auth oauth routes", () => {
    beforeEach(() => {
        exchangeGoogleAuthorizationCode.mockReset();
        verifyGoogleIdToken.mockReset();

        exchangeGoogleAuthorizationCode.mockResolvedValue({
            idToken: "mock-id-token",
        });
        verifyGoogleIdToken.mockResolvedValue({
            subject: "google-subject-default",
            email: "oauth-user@example.com",
            emailVerified: true,
        });
    });

    const createOAuthStartSession = async (app: ReturnType<typeof createApp>) => {
        const response = await request(app).get("/api/auth/oauth/google/start");
        const setCookies = Array.isArray(response.headers["set-cookie"]) ? response.headers["set-cookie"] : [];
        const cookieValue = extractCookieValue(setCookies, authCookieNames.oauthChallenge);

        const redirectLocation = response.headers.location;
        const redirectUrl = new URL(redirectLocation);
        const state = redirectUrl.searchParams.get("state");

        if (!cookieValue || !state) {
            throw new Error("OAuth start did not return cookie/state");
        }

        return {
            cookieValue,
            state,
        };
    };

    it("starts google oauth and sets signed challenge cookie", async () => {
        const app = createApp();
        const response = await request(app).get("/api/auth/oauth/google/start");

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
        expect(response.headers.location).toContain("code_challenge_method=S256");

        const setCookies = Array.isArray(response.headers["set-cookie"]) ? response.headers["set-cookie"] : [];
        const oauthCookie = extractCookieValue(setCookies, authCookieNames.oauthChallenge);

        expect(oauthCookie).toBeTruthy();
    });

    it("rejects callback when oauth challenge cookie is missing", async () => {
        const app = createApp();
        const response = await request(app).get("/api/auth/oauth/google/callback").query({
            state: "missing-cookie-state",
            code: "oauth-code",
        });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain(`${new URL(config.FRONTEND_URL).origin}/login`);
        expect(response.headers.location).toContain("oauthError=auth_failed");
        expect(response.headers["referrer-policy"]).toBe("no-referrer");
        expect(response.headers["cache-control"]).toContain("no-store");
    });

    it("rejects callback when challenge cookie signature is tampered", async () => {
        const app = createApp();
        const { state, cookieValue } = await createOAuthStartSession(app);
        const tamperedCookie = `${cookieValue}tampered`;

        const response = await request(app)
            .get("/api/auth/oauth/google/callback")
            .set("Cookie", `${authCookieNames.oauthChallenge}=${tamperedCookie}`)
            .query({
                state,
                code: "oauth-code",
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("oauthError=auth_failed");
    });

    it("completes callback for a verified active user and sets auth cookies", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "verified-oauth-user@example.com",
        });
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
            },
        });

        verifyGoogleIdToken.mockResolvedValueOnce({
            subject: "google-subject-success",
            email: user.email,
            emailVerified: true,
        });

        const { state, cookieValue } = await createOAuthStartSession(app);
        const response = await request(app)
            .get("/api/auth/oauth/google/callback")
            .set("Cookie", `${authCookieNames.oauthChallenge}=${cookieValue}`)
            .query({
                state,
                code: "oauth-code",
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe(`${new URL("/app", config.FRONTEND_URL).toString()}`);

        const setCookies = Array.isArray(response.headers["set-cookie"]) ? response.headers["set-cookie"] : [];
        expect(extractCookieValue(setCookies, authCookieNames.accessToken)).toBeTruthy();
        expect(extractCookieValue(setCookies, authCookieNames.refreshToken)).toBeTruthy();
    });

    it("blocks oauth login for inactive local users", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "inactive-oauth@example.com",
            isActive: false,
        });
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
            },
        });

        verifyGoogleIdToken.mockResolvedValueOnce({
            subject: "google-subject-inactive",
            email: user.email,
            emailVerified: true,
        });

        const { state, cookieValue } = await createOAuthStartSession(app);
        const response = await request(app)
            .get("/api/auth/oauth/google/callback")
            .set("Cookie", `${authCookieNames.oauthChallenge}=${cookieValue}`)
            .query({
                state,
                code: "oauth-code",
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("oauthError=account_inactive");
    });

    it("blocks oauth login for admin users", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "admin-oauth@example.com",
            role: UserRole.ADMIN,
        });
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
            },
        });

        verifyGoogleIdToken.mockResolvedValueOnce({
            subject: "google-subject-admin",
            email: user.email,
            emailVerified: true,
        });

        const { state, cookieValue } = await createOAuthStartSession(app);
        const response = await request(app)
            .get("/api/auth/oauth/google/callback")
            .set("Cookie", `${authCookieNames.oauthChallenge}=${cookieValue}`)
            .query({
                state,
                code: "oauth-code",
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("oauthError=account_restricted");
    });

    it("blocks oauth login for mfa-enabled users in v1", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "mfa-oauth@example.com",
        });
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                mfaEnabled: true,
            },
        });

        verifyGoogleIdToken.mockResolvedValueOnce({
            subject: "google-subject-mfa",
            email: user.email,
            emailVerified: true,
        });

        const { state, cookieValue } = await createOAuthStartSession(app);
        const response = await request(app)
            .get("/api/auth/oauth/google/callback")
            .set("Cookie", `${authCookieNames.oauthChallenge}=${cookieValue}`)
            .query({
                state,
                code: "oauth-code",
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("oauthError=additional_auth_required");
    });

    it("blocks auto-link when local email is not verified", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "unverified-link-oauth@example.com",
        });

        verifyGoogleIdToken.mockResolvedValueOnce({
            subject: "google-subject-unverified-local",
            email: user.email,
            emailVerified: true,
        });

        const { state, cookieValue } = await createOAuthStartSession(app);
        const response = await request(app)
            .get("/api/auth/oauth/google/callback")
            .set("Cookie", `${authCookieNames.oauthChallenge}=${cookieValue}`)
            .query({
                state,
                code: "oauth-code",
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("oauthError=account_action_required");
    });
});
