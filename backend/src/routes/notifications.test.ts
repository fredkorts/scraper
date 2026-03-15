import request from "supertest";
import { describe, expect, it } from "vitest";
import { NotificationChannelType, UserRole } from "@prisma/client";
import { createApp } from "../app";
import { config } from "../config";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";

useTestDatabase();

const authCookie = (userId: string, email: string, role: UserRole = UserRole.FREE) => {
    const token = signAccessToken({
        sub: userId,
        email,
        role: role.toLowerCase() as "free" | "paid" | "admin",
    });

    return `${authCookieNames.accessToken}=${token}`;
};

const extractStartToken = (deepLinkUrl: string): string => {
    const parsed = new URL(deepLinkUrl);
    return parsed.searchParams.get("start") ?? "";
};

describe("notification channel routes", () => {
    it("rejects unauthenticated channel requests", async () => {
        const app = createApp();

        const response = await request(app).get("/api/notifications/channels");

        expect(response.status).toBe(401);
        expect(response.body.error).toBe("unauthorized");
    });

    it("lists only the authenticated user's channels", async () => {
        const app = createApp();
        const { user: userA } = await createUser({ email: "notif-a@example.com" });
        const { user: userB } = await createUser({ email: "notif-b@example.com" });

        await prisma.notificationChannel.createMany({
            data: [
                {
                    userId: userA.id,
                    channelType: NotificationChannelType.EMAIL,
                    destination: "a@example.com",
                    isDefault: true,
                    isActive: true,
                },
                {
                    userId: userB.id,
                    channelType: NotificationChannelType.EMAIL,
                    destination: "b@example.com",
                    isDefault: true,
                    isActive: true,
                },
            ],
        });

        const response = await request(app)
            .get("/api/notifications/channels")
            .set("Cookie", authCookie(userA.id, userA.email));

        expect(response.status).toBe(200);
        expect(response.body.channels).toHaveLength(1);
        expect(response.body.channels[0].destination).toBe("a@example.com");
    });

    it("creates a new email channel and normalizes destination", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "notif-create@example.com" });

        const response = await request(app)
            .post("/api/notifications/channels")
            .set("Cookie", authCookie(user.id, user.email))
            .send({
                channelType: "email",
                destination: "  NewAddress@Example.com  ",
            });

        expect(response.status).toBe(201);
        expect(response.body.channel.destination).toBe("newaddress@example.com");
        expect(response.body.channel.isDefault).toBe(true);
    });

    it("rejects unsupported channel type", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "notif-unsupported@example.com" });

        const response = await request(app)
            .post("/api/notifications/channels")
            .set("Cookie", authCookie(user.id, user.email))
            .send({
                channelType: "discord",
                destination: "discord@example.com",
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("unsupported_channel_type");
    });

    it("updates channel destination and default state", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "notif-update@example.com" });

        const first = await prisma.notificationChannel.create({
            data: {
                userId: user.id,
                channelType: NotificationChannelType.EMAIL,
                destination: "first@example.com",
                isDefault: true,
                isActive: true,
            },
        });

        const second = await prisma.notificationChannel.create({
            data: {
                userId: user.id,
                channelType: NotificationChannelType.EMAIL,
                destination: "second@example.com",
                isDefault: false,
                isActive: true,
            },
        });

        const response = await request(app)
            .patch(`/api/notifications/channels/${second.id}`)
            .set("Cookie", authCookie(user.id, user.email))
            .send({
                destination: "updated@example.com",
                isDefault: true,
            });

        expect(response.status).toBe(200);
        expect(response.body.channel.destination).toBe("updated@example.com");
        expect(response.body.channel.isDefault).toBe(true);

        const refreshedFirst = await prisma.notificationChannel.findUniqueOrThrow({
            where: { id: first.id },
        });

        expect(refreshedFirst.isDefault).toBe(false);
    });

    it("soft-deletes a channel and keeps row persisted", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "notif-delete@example.com" });

        const channel = await prisma.notificationChannel.create({
            data: {
                userId: user.id,
                channelType: NotificationChannelType.EMAIL,
                destination: "delete-me@example.com",
                isDefault: true,
                isActive: true,
            },
        });

        const response = await request(app)
            .delete(`/api/notifications/channels/${channel.id}`)
            .set("Cookie", authCookie(user.id, user.email));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const refreshed = await prisma.notificationChannel.findUniqueOrThrow({
            where: { id: channel.id },
        });

        expect(refreshed.isActive).toBe(false);
        expect(refreshed.isDefault).toBe(false);
    });

    it("creates a telegram link challenge for paid users when feature is enabled", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "notif-telegram-link@example.com", role: UserRole.PAID });
        const previous = {
            enabled: config.NOTIFICATIONS_TELEGRAM_ENABLED,
            username: config.TELEGRAM_BOT_USERNAME,
        };
        config.NOTIFICATIONS_TELEGRAM_ENABLED = true;
        config.TELEGRAM_BOT_USERNAME = "pricepulse_test_bot";

        try {
            const response = await request(app)
                .post("/api/notifications/channels/telegram/link")
                .set("Cookie", authCookie(user.id, user.email, user.role));

            expect(response.status).toBe(200);
            expect(response.body.deepLinkUrl).toContain("https://t.me/pricepulse_test_bot?start=");
            expect(response.body.expiresAt).toBeTruthy();

            const token = extractStartToken(response.body.deepLinkUrl);
            expect(token.length).toBeGreaterThan(16);

            const challenge = await prisma.telegramLinkChallenge.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
            });

            expect(challenge).not.toBeNull();
            expect(challenge?.tokenHash).not.toBe(token);
            expect(challenge?.usedAt).toBeNull();
            expect(challenge?.confirmedAt).toBeNull();
        } finally {
            config.NOTIFICATIONS_TELEGRAM_ENABLED = previous.enabled;
            config.TELEGRAM_BOT_USERNAME = previous.username;
        }
    });

    it("rejects telegram linking for free users", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "notif-telegram-free@example.com", role: UserRole.FREE });
        const previous = {
            enabled: config.NOTIFICATIONS_TELEGRAM_ENABLED,
            username: config.TELEGRAM_BOT_USERNAME,
        };
        config.NOTIFICATIONS_TELEGRAM_ENABLED = true;
        config.TELEGRAM_BOT_USERNAME = "pricepulse_test_bot";

        try {
            const response = await request(app)
                .post("/api/notifications/channels/telegram/link")
                .set("Cookie", authCookie(user.id, user.email, user.role));

            expect(response.status).toBe(403);
            expect(response.body.error).toBe("telegram_not_allowed_for_plan");
        } finally {
            config.NOTIFICATIONS_TELEGRAM_ENABLED = previous.enabled;
            config.TELEGRAM_BOT_USERNAME = previous.username;
        }
    });

    it("consumes webhook token and confirms telegram channel", async () => {
        const app = createApp();
        const { user } = await createUser({ email: "notif-telegram-confirm@example.com", role: UserRole.PAID });
        const previous = {
            enabled: config.NOTIFICATIONS_TELEGRAM_ENABLED,
            username: config.TELEGRAM_BOT_USERNAME,
            webhookSecret: config.TELEGRAM_WEBHOOK_SECRET,
        };
        config.NOTIFICATIONS_TELEGRAM_ENABLED = true;
        config.TELEGRAM_BOT_USERNAME = "pricepulse_test_bot";
        config.TELEGRAM_WEBHOOK_SECRET = "telegram-webhook-secret";

        try {
            const linkResponse = await request(app)
                .post("/api/notifications/channels/telegram/link")
                .set("Cookie", authCookie(user.id, user.email, user.role));

            expect(linkResponse.status).toBe(200);
            const token = extractStartToken(linkResponse.body.deepLinkUrl);

            const webhookResponse = await request(app)
                .post("/api/notifications/telegram/webhook")
                .set("x-telegram-bot-api-secret-token", config.TELEGRAM_WEBHOOK_SECRET)
                .send({
                    update_id: 1001001,
                    message: {
                        text: `/start ${token}`,
                        chat: {
                            id: 99887766,
                            type: "private",
                        },
                        from: {
                            id: 44556677,
                        },
                    },
                });

            expect(webhookResponse.status).toBe(200);
            expect(webhookResponse.body.success).toBe(true);
            expect(webhookResponse.body.consumed).toBe(true);

            const statusResponse = await request(app)
                .get("/api/notifications/channels/telegram/link-status")
                .set("Cookie", authCookie(user.id, user.email, user.role));

            expect(statusResponse.status).toBe(200);
            expect(statusResponse.body.status).toBe("awaiting_confirmation");
            expect(statusResponse.body.challengeId).toBeTruthy();

            const confirmResponse = await request(app)
                .post("/api/notifications/channels/telegram/confirm")
                .set("Cookie", authCookie(user.id, user.email, user.role))
                .send({ challengeId: statusResponse.body.challengeId });

            expect(confirmResponse.status).toBe(200);
            expect(confirmResponse.body.channel.channelType).toBe("telegram");
            expect(confirmResponse.body.channel.isActive).toBe(true);
            expect(confirmResponse.body.verificationMessage.status).toBe("sent");

            const savedChannel = await prisma.notificationChannel.findFirst({
                where: {
                    userId: user.id,
                    channelType: NotificationChannelType.TELEGRAM,
                    isActive: true,
                },
            });
            expect(savedChannel?.destination).toBe("99887766");

            const challenge = await prisma.telegramLinkChallenge.findUniqueOrThrow({
                where: { id: statusResponse.body.challengeId as string },
            });
            expect(challenge.confirmedAt).not.toBeNull();
            expect(challenge.verificationMessageSentAt).not.toBeNull();
        } finally {
            config.NOTIFICATIONS_TELEGRAM_ENABLED = previous.enabled;
            config.TELEGRAM_BOT_USERNAME = previous.username;
            config.TELEGRAM_WEBHOOK_SECRET = previous.webhookSecret;
        }
    });
});
