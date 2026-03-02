import request from "supertest";
import { describe, expect, it } from "vitest";
import { NotificationChannelType } from "@prisma/client";
import { createApp } from "../app";
import { authCookieNames } from "../lib/cookies";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { useTestDatabase } from "../test/db";
import { createUser } from "../test/factories";

useTestDatabase();

const authCookie = (userId: string, email: string) => {
    const token = signAccessToken({
        sub: userId,
        email,
        role: "free",
    });

    return `${authCookieNames.accessToken}=${token}`;
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
});
