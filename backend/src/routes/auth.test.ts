import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { authCookieNames } from "../lib/cookies";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";
import { useTestDatabase } from "../test/db";
import { createRefreshTokenRecord, createUser } from "../test/factories";
import { extractCookieValue } from "../test/http";

useTestDatabase();

describe("auth routes", () => {
    const trustedOrigin = new URL(config.FRONTEND_URL).origin;

    it("registers a user and sets auth cookies", async () => {
        const app = createApp();

        const response = await request(app).post("/api/auth/register").set("Origin", trustedOrigin).send({
            email: "routeuser@example.com",
            password: "Password123",
            name: "Route User",
        });

        expect(response.status).toBe(201);
        expect(response.body.user.email).toBe("routeuser@example.com");
        expect(response.body.user).not.toHaveProperty("passwordHash");

        const setCookies = Array.isArray(response.headers["set-cookie"]) ? response.headers["set-cookie"] : [];
        expect(extractCookieValue(setCookies, authCookieNames.accessToken)).toBeTruthy();
        expect(extractCookieValue(setCookies, authCookieNames.refreshToken)).toBeTruthy();
    });

    it("rejects duplicate registration", async () => {
        const app = createApp();

        await request(app).post("/api/auth/register").set("Origin", trustedOrigin).send({
            email: "duplicate@example.com",
            password: "Password123",
            name: "First User",
        });

        const response = await request(app).post("/api/auth/register").set("Origin", trustedOrigin).send({
            email: "duplicate@example.com",
            password: "Password123",
            name: "Second User",
        });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe("conflict");
    });

    it("logs in with valid credentials and sets cookies", async () => {
        const app = createApp();
        const { user, password } = await createUser({
            email: "login@example.com",
        });

        const response = await request(app).post("/api/auth/login").set("Origin", trustedOrigin).send({
            email: user.email,
            password,
        });

        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(user.email);
        expect(response.headers["set-cookie"]).toBeTruthy();
    });

    it("returns generic invalid-credential errors on failed login", async () => {
        const app = createApp();
        await createUser({
            email: "failed-login@example.com",
        });

        const response = await request(app).post("/api/auth/login").set("Origin", trustedOrigin).send({
            email: "failed-login@example.com",
            password: "WrongPassword123",
        });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid email or password");
    });

    it("returns the current user when given a valid access cookie", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "me@example.com",
        });
        const accessToken = signAccessToken({
            sub: user.id,
            email: user.email,
            role: "free",
        });

        const response = await request(app)
            .get("/api/auth/me")
            .set("Cookie", `${authCookieNames.accessToken}=${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(user.email);
    });

    it("updates the current user's display name", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "profile-update@example.com",
        });
        const csrfResponse = await request(app).get("/api/auth/csrf");
        const csrfSetCookie = Array.isArray(csrfResponse.headers["set-cookie"])
            ? csrfResponse.headers["set-cookie"]
            : [];
        const csrfCookie = extractCookieValue(csrfSetCookie, authCookieNames.csrfToken)!;
        const accessToken = signAccessToken({
            sub: user.id,
            email: user.email,
            role: "free",
        });

        const response = await request(app)
            .patch("/api/auth/me")
            .set("Cookie", [
                `${authCookieNames.accessToken}=${accessToken}`,
                `${authCookieNames.csrfToken}=${csrfCookie}`,
            ])
            .set("Origin", trustedOrigin)
            .set("x-csrf-token", csrfCookie)
            .send({
                name: "Updated Profile Name",
            });

        expect(response.status).toBe(200);
        expect(response.body.user.name).toBe("Updated Profile Name");
    });

    it("rotates refresh tokens on /refresh", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "refresh@example.com",
        });
        const token = await createRefreshTokenRecord({ userId: user.id });
        const csrfResponse = await request(app).get("/api/auth/csrf");
        const csrfSetCookie = Array.isArray(csrfResponse.headers["set-cookie"])
            ? csrfResponse.headers["set-cookie"]
            : [];
        const csrfCookie = extractCookieValue(csrfSetCookie, authCookieNames.csrfToken)!;

        const response = await request(app)
            .post("/api/auth/refresh")
            .set("Origin", trustedOrigin)
            .set("x-csrf-token", csrfCookie)
            .set("Cookie", [
                `${authCookieNames.refreshToken}=${token.rawToken}`,
                `${authCookieNames.csrfToken}=${csrfCookie}`,
            ]);

        expect(response.status).toBe(200);

        const oldToken = await prisma.refreshToken.findUniqueOrThrow({
            where: { id: token.record.id },
        });

        expect(oldToken.revocationReason).toBe("rotated");
        expect(oldToken.replacedByTokenId).toBeTruthy();
    });

    it("clears cookies and revokes the token on logout", async () => {
        const app = createApp();
        const { user } = await createUser({
            email: "logout@example.com",
        });
        const token = await createRefreshTokenRecord({ userId: user.id });
        const csrfResponse = await request(app).get("/api/auth/csrf");
        const csrfSetCookie = Array.isArray(csrfResponse.headers["set-cookie"])
            ? csrfResponse.headers["set-cookie"]
            : [];
        const csrfCookie = extractCookieValue(csrfSetCookie, authCookieNames.csrfToken)!;

        const response = await request(app)
            .post("/api/auth/logout")
            .set("Origin", trustedOrigin)
            .set("x-csrf-token", csrfCookie)
            .set("Cookie", [
                `${authCookieNames.refreshToken}=${token.rawToken}`,
                `${authCookieNames.csrfToken}=${csrfCookie}`,
            ]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const revoked = await prisma.refreshToken.findUniqueOrThrow({
            where: { id: token.record.id },
        });

        expect(revoked.revocationReason).toBe("logout");
        expect(response.headers["set-cookie"]).toBeTruthy();
    });
});
