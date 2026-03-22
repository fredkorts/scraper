import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { config } from "../config";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";
import { extractCookieValue } from "../test/http";

useTestDatabase();

const originalStrictMode = config.AUTH_MUTATION_CSRF_STRICT_MODE;
const originalTelegramEnabled = config.NOTIFICATIONS_TELEGRAM_ENABLED;
const originalTelegramWebhookSecret = config.TELEGRAM_WEBHOOK_SECRET;

const trustedOrigin = new URL(config.FRONTEND_URL).origin;

afterEach(() => {
    config.AUTH_MUTATION_CSRF_STRICT_MODE = originalStrictMode;
    config.NOTIFICATIONS_TELEGRAM_ENABLED = originalTelegramEnabled;
    config.TELEGRAM_WEBHOOK_SECRET = originalTelegramWebhookSecret;
});

const accessCookie = (userId: string, email: string, tokenVersion: number): string => {
    const token = signAccessToken({
        sub: userId,
        email,
        role: "free",
        tokenVersion,
    });

    return `${authCookieNames.accessToken}=${token}`;
};

describe("csrf mutation strict mode coverage", () => {
    it("returns csrf_mismatch for cookie-auth mutations without matching csrf token", async () => {
        config.AUTH_MUTATION_CSRF_STRICT_MODE = true;
        const app = createApp();
        const { user } = await createUser({ email: "csrf-missing@example.com" });
        const category = await prisma.category.create({
            data: {
                slug: "csrf-missing-category",
                nameEt: "CSRF Missing",
                nameEn: "CSRF Missing",
            },
        });

        const response = await request(app)
            .post("/api/subscriptions")
            .set("Origin", trustedOrigin)
            .set("Cookie", accessCookie(user.id, user.email, user.tokenVersion))
            .send({ categoryId: category.id });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("csrf_mismatch");
    });

    it("returns origin_not_allowed for cookie-auth mutations from untrusted origins", async () => {
        config.AUTH_MUTATION_CSRF_STRICT_MODE = true;
        const app = createApp();
        const { user } = await createUser({ email: "csrf-origin@example.com" });
        const category = await prisma.category.create({
            data: {
                slug: "csrf-origin-category",
                nameEt: "CSRF Origin",
                nameEn: "CSRF Origin",
            },
        });
        const csrfResponse = await request(app).get("/api/auth/csrf");
        const setCookies = Array.isArray(csrfResponse.headers["set-cookie"]) ? csrfResponse.headers["set-cookie"] : [];
        const csrfToken = extractCookieValue(setCookies, authCookieNames.csrfToken) as string;

        const response = await request(app)
            .post("/api/subscriptions")
            .set("Origin", "https://evil.example")
            .set("x-csrf-token", csrfToken)
            .set("Cookie", [
                accessCookie(user.id, user.email, user.tokenVersion),
                `${authCookieNames.csrfToken}=${csrfToken}`,
            ])
            .send({ categoryId: category.id });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("origin_not_allowed");
    });

    it("keeps webhook endpoint exempt from browser csrf checks but requires webhook secret", async () => {
        config.AUTH_MUTATION_CSRF_STRICT_MODE = true;
        config.NOTIFICATIONS_TELEGRAM_ENABLED = true;
        config.TELEGRAM_WEBHOOK_SECRET = "telegram-test-webhook-secret";

        const app = createApp();

        const unauthorized = await request(app)
            .post("/api/notifications/telegram/webhook")
            .set("Origin", trustedOrigin)
            .send({ update_id: 123 });

        expect(unauthorized.status).toBe(401);
        expect(unauthorized.body.error).toBe("telegram_webhook_unauthorized");

        const accepted = await request(app)
            .post("/api/notifications/telegram/webhook")
            .set("Origin", "https://evil.example")
            .set("x-telegram-bot-api-secret-token", config.TELEGRAM_WEBHOOK_SECRET)
            .send({ update_id: 456 });

        expect(accepted.status).toBe(200);
        expect(accepted.body.success).toBe(true);
    });
});
