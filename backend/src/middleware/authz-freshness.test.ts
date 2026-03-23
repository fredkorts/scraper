import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";
import { config } from "../config";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";
import { requireAdmin, requireAuth, requireAuthzFresh } from "./auth";
import { highCostReadLimiter } from "./rate-limit";

useTestDatabase();

const createProtectedTestApp = () => {
    const app = express();
    app.use(cookieParser());
    app.get("/admin-only", highCostReadLimiter, requireAuth, requireAuthzFresh, requireAdmin, (_req, res) => {
        res.status(200).json({ success: true });
    });
    app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
        void next;
        const appError = error as { statusCode?: number; code?: string; message?: string };
        res.status(appError.statusCode ?? 500).json({
            error: appError.code ?? "internal_error",
            message: appError.message ?? "Unexpected error",
        });
    });
    return app;
};

const originalAuthzFreshnessEnabled = config.AUTHZ_FRESHNESS_ENABLED;
const originalTokenVersionEnforced = config.AUTH_TOKEN_VERSION_ENFORCED;

const setAdminCookie = (token: string) => `${authCookieNames.accessToken}=${token}`;

afterEach(() => {
    config.AUTHZ_FRESHNESS_ENABLED = originalAuthzFreshnessEnabled;
    config.AUTH_TOKEN_VERSION_ENFORCED = originalTokenVersionEnforced;
});

describe("requireAuthzFresh", () => {
    it("denies deactivated users even if token is still valid", async () => {
        config.AUTHZ_FRESHNESS_ENABLED = true;
        config.AUTH_TOKEN_VERSION_ENFORCED = false;

        const app = createProtectedTestApp();
        const { user } = await createUser({
            email: "authz-fresh-inactive@example.com",
            role: UserRole.ADMIN,
        });
        const token = signAccessToken({
            sub: user.id,
            email: user.email,
            role: "admin",
            tokenVersion: user.tokenVersion,
        });

        await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false },
        });

        const response = await request(app).get("/admin-only").set("Cookie", setAdminCookie(token));

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("forbidden");
    });

    it("denies downgraded admins on admin routes", async () => {
        config.AUTHZ_FRESHNESS_ENABLED = true;
        config.AUTH_TOKEN_VERSION_ENFORCED = false;

        const app = createProtectedTestApp();
        const { user } = await createUser({
            email: "authz-fresh-downgraded@example.com",
            role: UserRole.ADMIN,
        });
        const token = signAccessToken({
            sub: user.id,
            email: user.email,
            role: "admin",
            tokenVersion: user.tokenVersion,
        });

        await prisma.user.update({
            where: { id: user.id },
            data: { role: UserRole.FREE },
        });

        const response = await request(app).get("/admin-only").set("Cookie", setAdminCookie(token));

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("forbidden");
    });

    it("accepts tokens without tokenVersion while enforcement is off", async () => {
        config.AUTHZ_FRESHNESS_ENABLED = true;
        config.AUTH_TOKEN_VERSION_ENFORCED = false;

        const app = createProtectedTestApp();
        const { user } = await createUser({
            email: "authz-token-version-off@example.com",
            role: UserRole.ADMIN,
        });
        const tokenWithoutVersion = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: "admin",
                type: "access",
            },
            config.JWT_SECRET,
            {
                algorithm: "HS256",
                issuer: config.JWT_ISSUER,
                audience: config.JWT_AUDIENCE,
                expiresIn: "15m",
            },
        );

        const response = await request(app).get("/admin-only").set("Cookie", setAdminCookie(tokenWithoutVersion));

        expect(response.status).toBe(200);
    });

    it("rejects tokens without tokenVersion while enforcement is on", async () => {
        config.AUTHZ_FRESHNESS_ENABLED = true;
        config.AUTH_TOKEN_VERSION_ENFORCED = true;

        const app = createProtectedTestApp();
        const { user } = await createUser({
            email: "authz-token-version-on@example.com",
            role: UserRole.ADMIN,
        });
        const tokenWithoutVersion = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: "admin",
                type: "access",
            },
            config.JWT_SECRET,
            {
                algorithm: "HS256",
                issuer: config.JWT_ISSUER,
                audience: config.JWT_AUDIENCE,
                expiresIn: "15m",
            },
        );

        const response = await request(app).get("/admin-only").set("Cookie", setAdminCookie(tokenWithoutVersion));

        expect(response.status).toBe(401);
        expect(response.body.error).toBe("unauthorized");
    });

    it("rejects tokens whose tokenVersion no longer matches the user record", async () => {
        config.AUTHZ_FRESHNESS_ENABLED = true;
        config.AUTH_TOKEN_VERSION_ENFORCED = true;

        const app = createProtectedTestApp();
        const { user } = await createUser({
            email: "authz-token-version-mismatch@example.com",
            role: UserRole.ADMIN,
        });
        const token = signAccessToken({
            sub: user.id,
            email: user.email,
            role: "admin",
            tokenVersion: user.tokenVersion,
        });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                tokenVersion: {
                    increment: 1,
                },
            },
        });

        const response = await request(app).get("/admin-only").set("Cookie", setAdminCookie(token));

        expect(response.status).toBe(401);
        expect(response.body.error).toBe("unauthorized");
    });
});
